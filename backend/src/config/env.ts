import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  aiBackendUrl: process.env.AI_BACKEND_URL ?? 'http://localhost:8001',

  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),

  kafka: {
    brokers: required('KAFKA_BROKERS', 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID ?? 'events-manage-api',
    consumerGroup: process.env.KAFKA_CONSUMER_GROUP ?? 'events-manage-consumer',
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '10y',
  },

  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 0),

  upload: {
    dir: path.resolve(process.env.UPLOAD_DIR ?? './uploads'),
    maxBytes: Number(process.env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024),
    publicPath: process.env.PUBLIC_UPLOAD_PATH ?? '/static',
  },
};

export type Env = typeof env;
