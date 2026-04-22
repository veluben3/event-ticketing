import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  transport:
    env.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
});
