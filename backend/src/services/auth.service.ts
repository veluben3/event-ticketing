import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/httpError';
import { sessionService } from './session.service';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { redis, redisKeys } from '../config/redis';
import { env } from '../config/env';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: Role;
  companyName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

function toUserDto(u: {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyName: string | null;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    companyName: u.companyName,
  };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw HttpError.conflict('Email already registered');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const role = input.role ?? Role.USER;
    if (role === Role.ORGANIZER && !input.companyName) {
      throw HttpError.validation('companyName is required for ORGANIZER role');
    }

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
        role,
        companyName: input.companyName,
      },
    });
    return toUserDto(user);
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user) throw HttpError.unauthorized('Invalid credentials');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw HttpError.unauthorized('Invalid credentials');

    const sessionId = await sessionService.create({
      userId: user.id,
      role: user.role,
      email: user.email,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role, sessionId);
    return { user: toUserDto(user), ...tokens };
  },

  async issueTokens(
    userId: string,
    email: string,
    role: Role,
    sessionId: string,
  ): Promise<AuthTokens> {
    const accessToken = signAccessToken({ sub: userId, sid: sessionId, role, email });
    const jti = uuid();
    const refreshToken = signRefreshToken({ sub: userId, sid: sessionId, jti });
    await redis.set(redisKeys.refresh(jti), userId, 'EX', env.sessionTtlSeconds);
    return { accessToken, refreshToken };
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let claims;
    try {
      claims = verifyRefreshToken(refreshToken);
    } catch {
      throw HttpError.unauthorized('Invalid refresh token');
    }

    const stored = await redis.get(redisKeys.refresh(claims.jti));
    if (!stored || stored !== claims.sub) throw HttpError.unauthorized('Refresh token revoked');

    await redis.del(redisKeys.refresh(claims.jti));

    const session = await sessionService.get(claims.sid);
    if (!session) throw HttpError.unauthorized('Session expired');

    return this.issueTokens(claims.sub, session.email, session.role, claims.sid);
  },

  async logout(sessionId: string) {
    await sessionService.destroy(sessionId);
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw HttpError.notFound('User not found');
    return toUserDto(user);
  },
};
