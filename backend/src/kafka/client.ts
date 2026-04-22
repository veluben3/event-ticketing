import { Kafka, logLevel } from 'kafkajs';
import { env } from '../config/env';

export const kafka = new Kafka({
  clientId: env.kafka.clientId,
  brokers: env.kafka.brokers,
  logLevel: logLevel.WARN,
  retry: { retries: 8, initialRetryTime: 300 },
});
