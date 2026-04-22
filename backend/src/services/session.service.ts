import { v4 as uuid } from 'uuid';
import { redis, redisKeys } from '../config/redis';
import { env } from '../config/env';
import { Role } from '@prisma/client';

export interface SessionData {
  userId: string;
  role: Role;
  email: string;
  ip?: string;
  userAgent?: string;
  issuedAt: number;
}

export const sessionService = {
  async create(data: Omit<SessionData, 'issuedAt'>): Promise<string> {
    const sessionId = uuid();
    const key = redisKeys.session(sessionId);
    const payload: SessionData = { ...data, issuedAt: Date.now() };
    const pipe = redis.multi();
    pipe.hset(key, {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      ip: payload.ip ?? '',
      userAgent: payload.userAgent ?? '',
      issuedAt: String(payload.issuedAt),
    });
    if (env.sessionTtlSeconds > 0) {
      pipe.expire(key, env.sessionTtlSeconds);
    }
    pipe.sadd(redisKeys.userSessions(payload.userId), sessionId);
    await pipe.exec();
    return sessionId;
  },

  async get(sessionId: string): Promise<SessionData | null> {
    const data = await redis.hgetall(redisKeys.session(sessionId));
    if (!data || !data.userId) return null;
    return {
      userId: data.userId,
      role: data.role as Role,
      email: data.email,
      ip: data.ip,
      userAgent: data.userAgent,
      issuedAt: Number(data.issuedAt),
    };
  },

  async touch(sessionId: string): Promise<void> {
    if (env.sessionTtlSeconds > 0) {
      await redis.expire(redisKeys.session(sessionId), env.sessionTtlSeconds);
    }
  },

  async destroy(sessionId: string): Promise<void> {
    const session = await this.get(sessionId);
    const pipe = redis.multi();
    pipe.del(redisKeys.session(sessionId));
    if (session) pipe.srem(redisKeys.userSessions(session.userId), sessionId);
    await pipe.exec();
  },

  async destroyAllForUser(userId: string): Promise<number> {
    const key = redisKeys.userSessions(userId);
    const ids = await redis.smembers(key);
    if (ids.length === 0) return 0;
    const pipe = redis.multi();
    for (const id of ids) pipe.del(redisKeys.session(id));
    pipe.del(key);
    await pipe.exec();
    return ids.length;
  },
};
