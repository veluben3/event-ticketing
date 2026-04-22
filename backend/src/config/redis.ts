import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));

export const redisKeys = {
  session: (id: string) => `session:${id}`,
  userSessions: (userId: string) => `user:${userId}:sessions`,
  refresh: (tokenId: string) => `refresh:${tokenId}`,
  eventDetail: (id: string) => `events:detail:${id}`,
  eventList: (key: string) => `events:list:${key}`,
  rlLogin: (ip: string) => `rl:login:${ip}`,
  rlPurchase: (userId: string) => `rl:purchase:${userId}`,
  idempotency: (key: string) => `idemp:${key}`,
};
