import { redis } from '../config/redis';
import { logger } from './logger';

/**
 * Sliding-window rate limiter using a Redis sorted set.
 * Fails open on Redis error (logs a warning) so outages don't block users.
 */
export async function slidingWindowAllow(
  key: string,
  windowMs: number,
  max: number,
): Promise<boolean> {
  const now = Date.now();
  try {
    const pipe = redis.multi();
    pipe.zremrangebyscore(key, 0, now - windowMs);
    pipe.zcard(key);
    pipe.zadd(key, now, `${now}-${Math.random()}`);
    pipe.pexpire(key, windowMs);
    const res = await pipe.exec();
    const count = Number(res?.[1]?.[1] ?? 0);
    return count < max;
  } catch (err) {
    logger.warn({ err }, 'rate limiter failure - failing open');
    return true;
  }
}
