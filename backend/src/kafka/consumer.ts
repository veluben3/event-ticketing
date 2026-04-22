import { Consumer } from 'kafkajs';
import { kafka } from './client';
import { TOPICS, PaymentInitiatedEvent, PaymentResultEvent, TicketConfirmedEvent } from './topics';
import { publish } from './producer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ticketsService } from '../services/tickets.service';

let consumer: Consumer | null = null;

async function handlePaymentInitiated(raw: string) {
  const evt = JSON.parse(raw) as PaymentInitiatedEvent;
  logger.info({ orderRef: evt.orderRef }, 'processing payment.initiated');

  // Mock payment gateway – ~85% success rate, 300-1200ms latency.
  const delay = 300 + Math.floor(Math.random() * 900);
  await new Promise((r) => setTimeout(r, delay));
  const succeeded = Math.random() < 0.85;

  const result: PaymentResultEvent = {
    ticketId: evt.ticketId,
    orderRef: evt.orderRef,
    status: succeeded ? 'SUCCEEDED' : 'FAILED',
    providerRef: succeeded ? `MOCK-${evt.orderRef}` : undefined,
    reason: succeeded ? undefined : 'MOCK_DECLINED',
    processedAt: Date.now(),
  };
  await publish(TOPICS.PAYMENT_RESULT, evt.orderRef, result);
}

async function handlePaymentResult(raw: string) {
  const evt = JSON.parse(raw) as PaymentResultEvent;
  logger.info({ orderRef: evt.orderRef, status: evt.status }, 'applying payment.result');
  await ticketsService.applyPaymentResult(evt);

  if (evt.status === 'SUCCEEDED') {
    const confirmed: TicketConfirmedEvent = {
      ticketId: evt.ticketId,
      orderRef: evt.orderRef,
      userId: '',
      eventId: '',
      confirmedAt: Date.now(),
    };
    await publish(TOPICS.TICKET_CONFIRMED, evt.orderRef, confirmed);
  }
}

async function handleTicketConfirmed(raw: string) {
  const evt = JSON.parse(raw) as TicketConfirmedEvent;
  logger.info({ orderRef: evt.orderRef }, 'ticket.confirmed (would send email/SMS here)');
}

export async function startConsumer() {
  consumer = kafka.consumer({ groupId: env.kafka.consumerGroup });
  await consumer.connect();
  await consumer.subscribe({
    topics: [TOPICS.PAYMENT_INITIATED, TOPICS.PAYMENT_RESULT, TOPICS.TICKET_CONFIRMED],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const value = message.value?.toString();
      if (!value) return;
      try {
        switch (topic) {
          case TOPICS.PAYMENT_INITIATED:
            await handlePaymentInitiated(value);
            break;
          case TOPICS.PAYMENT_RESULT:
            await handlePaymentResult(value);
            break;
          case TOPICS.TICKET_CONFIRMED:
            await handleTicketConfirmed(value);
            break;
        }
      } catch (err) {
        logger.error({ err, topic }, 'consumer handler failed');
      }
    },
  });
  logger.info('Kafka consumer started');
}

async function shutdown() {
  if (consumer) await consumer.disconnect();
  process.exit(0);
}

if (require.main === module) {
  startConsumer().catch((err) => {
    logger.error({ err }, 'consumer failed to start');
    process.exit(1);
  });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
