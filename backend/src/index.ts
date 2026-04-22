import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import fs from 'fs';

import { env } from './config/env';
import { logger } from './utils/logger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { startConsumer } from './kafka/consumer';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

fs.mkdirSync(env.upload.dir, { recursive: true });
app.use(env.upload.publicPath, express.static(env.upload.dir, { maxAge: '7d' }));

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

async function main() {
  const server = app.listen(env.port, () => {
    logger.info(`API listening on http://localhost:${env.port}`);
    logger.info(`Static uploads served from ${env.upload.publicPath} -> ${env.upload.dir}`);
  });

  // Start Kafka consumer in the same process for dev simplicity.
  // In production, deploy it as a separate worker (`npm run start:consumer`).
  if (process.env.RUN_CONSUMER !== 'false') {
    startConsumer().catch((err) => logger.error({ err }, 'consumer failed'));
  }

  const shutdown = async () => {
    logger.info('shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});
