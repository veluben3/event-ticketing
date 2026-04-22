import type { Request, Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authService } from '../services/auth.service';
import { HttpError } from '../utils/httpError';
import { slidingWindowAllow } from '../utils/rateLimiter';
import { redisKeys } from '@/config/redis';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
  role: z.nativeEnum(Role).optional(),
  companyName: z.string().min(1).max(200).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authController = {
  async register(req: Request, res: Response) {
    const body = registerSchema.parse(req.body);
    const user = await authService.register(body);
    res.status(201).json({ user });
  },

  async login(req: Request, res: Response) {
    const body = loginSchema.parse(req.body);
    const ip = req.ip ?? 'unknown';

    const allowed = await slidingWindowAllow(redisKeys.rlLogin(ip), 15 * 60_000, 10);
    if (!allowed) throw HttpError.rateLimited('Too many login attempts, try again later');

    const result = await authService.login({
      email: body.email,
      password: body.password,
      ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth',
    });

    res.json({ user: result.user, accessToken: result.accessToken });
  },

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) throw HttpError.unauthorized('Missing refresh token');

    const tokens = await authService.refresh(token);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth',
    });
    res.json({ accessToken: tokens.accessToken });
  },

  async logout(req: Request, res: Response) {
    if (req.user) await authService.logout(req.user.sid);
    res.clearCookie('refreshToken', { path: '/auth' });
    res.status(204).end();
  },

  async me(req: Request, res: Response) {
    if (!req.user) throw HttpError.unauthorized();
    const user = await authService.me(req.user.sub);
    res.json({ user });
  },
};
