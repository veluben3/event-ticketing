import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '@prisma/client';

export interface AccessTokenClaims extends JwtPayload {
  sub: string;
  sid: string;
  role: Role;
  email: string;
}

export interface RefreshTokenClaims extends JwtPayload {
  sub: string;
  jti: string;
  sid: string;
}

export function signAccessToken(claims: Omit<AccessTokenClaims, 'iat' | 'exp'>) {
  const opts: SignOptions = { expiresIn: env.jwt.accessTtl as SignOptions['expiresIn'] };
  return jwt.sign(claims, env.jwt.accessSecret, opts);
}

export function signRefreshToken(claims: Omit<RefreshTokenClaims, 'iat' | 'exp'>) {
  const opts: SignOptions = { expiresIn: env.jwt.refreshTtl as SignOptions['expiresIn'] };
  return jwt.sign(claims, env.jwt.refreshSecret, opts);
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenClaims;
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenClaims;
}
