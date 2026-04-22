import { EventStatus, TicketStatus, PaymentStatus, Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { prisma } from '../config/prisma';
import { redis, redisKeys } from '../config/redis';
import { HttpError } from '../utils/httpError';
import { publish } from '../kafka/producer';
import { TOPICS, PaymentInitiatedEvent, PaymentResultEvent } from '../kafka/topics';
import { logger } from '../utils/logger';

export interface PurchaseInput {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  idempotencyKey?: string;
}

export const ticketsService = {
  async purchase(userId: string, input: PurchaseInput) {
    if (input.quantity <= 0 || input.quantity > 10) {
      throw HttpError.validation('quantity must be 1..10');
    }

    if (input.idempotencyKey) {
      const cached = await redis.get(redisKeys.idempotency(input.idempotencyKey));
      if (cached) return JSON.parse(cached);
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: input.eventId } });
      if (!event) throw HttpError.notFound('Event not found');
      if (event.status !== EventStatus.PUBLISHED) {
        throw HttpError.badRequest('Event not available for purchase');
      }
      const ticketType = await tx.eventTicketType.findFirst({
        where: { id: input.ticketTypeId, eventId: input.eventId },
      });
      if (!ticketType) throw HttpError.notFound('Ticket type not found');
      if (event.ticketsSold + input.quantity > event.capacity) {
        throw HttpError.conflict('Not enough tickets available');
      }

      const totalCents = ticketType.priceCents * input.quantity;
      const orderRef = `ORD-${Date.now()}-${uuid().slice(0, 8).toUpperCase()}`;

      const created = await tx.ticket.create({
        data: {
          orderRef,
          eventId: event.id,
          ticketTypeId: ticketType.id,
          userId,
          quantity: input.quantity,
          totalCents,
          currency: event.currency,
          status: TicketStatus.PENDING,
        },
        include: {
          event: { include: { ticketTypes: { orderBy: { position: 'asc' } } } },
          payment: true,
          ticketType: true,
        },
      });

      await tx.payment.create({
        data: {
          ticketId: created.id,
          amountCents: totalCents,
          currency: event.currency,
          provider: 'mock',
          status: PaymentStatus.INITIATED,
        },
      });

      await tx.event.update({
        where: { id: event.id },
        data: { ticketsSold: { increment: input.quantity } },
      });

      return created;
    });

    const payload: PaymentInitiatedEvent = {
      ticketId: ticket.id,
      orderRef: ticket.orderRef,
      userId,
      eventId: ticket.eventId,
      amountCents: ticket.totalCents,
      currency: ticket.currency,
      issuedAt: Date.now(),
    };

    try {
      await publish(TOPICS.PAYMENT_INITIATED, ticket.orderRef, payload);
    } catch (err) {
      logger.error({ err, orderRef: ticket.orderRef }, 'failed to publish payment.initiated');
    }

    const response = { ticket };
    if (input.idempotencyKey) {
      await redis.set(
        redisKeys.idempotency(input.idempotencyKey),
        JSON.stringify(response),
        'EX',
        24 * 60 * 60,
      );
    }
    return response;
  },

  async listForUser(userId: string, page = 1, pageSize = 20) {
    const where: Prisma.TicketWhereInput = { userId };
    const [total, items] = await prisma.$transaction([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: {
          event: { include: { ticketTypes: { orderBy: { position: 'asc' } } } },
          payment: true,
          ticketType: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, items };
  },

  async getForUser(userId: string, ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: { include: { ticketTypes: { orderBy: { position: 'asc' } } } },
        payment: true,
        ticketType: true,
      },
    });
    if (!ticket || ticket.userId !== userId) throw HttpError.notFound('Ticket not found');
    return ticket;
  },

  async salesForOrganizer(organizerId: string) {
    const items = await prisma.ticket.findMany({
      where: { event: { organizerId } },
      include: {
        event: { select: { id: true, title: true, startAt: true } },
        user: { select: { id: true, email: true, name: true } },
        ticketType: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return items;
  },

  async applyPaymentResult(evt: PaymentResultEvent) {
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: evt.ticketId } });
      if (!ticket) return;

      if (evt.status === 'SUCCEEDED') {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: TicketStatus.PAID },
        });
        await tx.payment.update({
          where: { ticketId: ticket.id },
          data: {
            status: PaymentStatus.SUCCEEDED,
            providerRef: evt.providerRef,
            rawResponse: evt as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: TicketStatus.FAILED },
        });
        await tx.payment.update({
          where: { ticketId: ticket.id },
          data: {
            status: PaymentStatus.FAILED,
            rawResponse: evt as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.event.update({
          where: { id: ticket.eventId },
          data: { ticketsSold: { decrement: ticket.quantity } },
        });
      }
    });
  },
};
