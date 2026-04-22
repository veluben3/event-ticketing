import type { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { HttpError } from '../utils/httpError';
import { verifyAccessToken, AccessTokenClaims } from '../utils/jwt';
import { sessionService } from '../services/session.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenClaims;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw HttpError.unauthorized('Missing bearer token');
    const token = header.slice(7);
    const claims = verifyAccessToken(token);

    const session = await sessionService.get(claims.sid);
    if (!session || session.userId !== claims.sub) {
      throw HttpError.unauthorized('Session expired');
    }
    await sessionService.touch(claims.sid);

    req.user = claims;
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    return next(HttpError.unauthorized('Invalid or expired token'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(HttpError.unauthorized());
    if (!roles.includes(req.user.role)) return next(HttpError.forbidden('Insufficient role'));
    next();
  };
}
