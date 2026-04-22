import { Producer } from 'kafkajs';
import { kafka } from './client';
import { TopicName } from './topics';
import { logger } from '../utils/logger';

let producer: Producer | null = null;
let connecting: Promise<Producer> | null = null;

async function getProducer(): Promise<Producer> {
  if (producer) return producer;
  if (!connecting) {
    connecting = (async () => {
      const p = kafka.producer({ allowAutoTopicCreation: true });
      await p.connect();
      producer = p;
      logger.info('Kafka producer connected');
      return p;
    })();
  }
  return connecting;
}

export async function publish<T>(topic: TopicName, key: string, payload: T): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic,
    messages: [{ key, value: JSON.stringify(payload) }],
  });
}

export async function disconnectProducer() {
  if (producer) {
    await producer.disconnect();
    producer = null;
    connecting = null;
  }
}
