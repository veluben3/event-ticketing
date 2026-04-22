import { EventCategory, EventStatus, Prisma, Role } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { redis, redisKeys } from '../config/redis';
import { HttpError } from '../utils/httpError';

export interface CreateEventInput {
  title: string;
  description: string;
  category: EventCategory;
  venue: string;
  addressLine?: string;
  city: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  startAt: string | Date;
  endAt: string | Date;
  priceCents?: number;
  currency?: string;
  capacity: number;
  bannerUrl?: string;
  images?: string[];
  ticketTypes: Array<{
    name: string;
    description?: string;
    priceCents: number;
  }>;
  status?: EventStatus;
}

export interface ListEventsInput {
  city?: string;
  category?: EventCategory;
  q?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
  organizerId?: string;
  status?: EventStatus;
}

function listCacheKey(input: ListEventsInput) {
  const h = crypto
    .createHash('sha1')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 16);
  return redisKeys.eventList(h);
}

export const eventsService = {
  async create(organizerId: string, input: CreateEventInput) {
    if (new Date(input.endAt) <= new Date(input.startAt)) {
      throw HttpError.validation('endAt must be after startAt');
    }
    if (input.capacity <= 0) throw HttpError.validation('capacity must be positive');
    if (!input.ticketTypes.length) throw HttpError.validation('At least one ticket type is required');
    if (input.ticketTypes.some((type) => type.priceCents < 0)) {
      throw HttpError.validation('ticket type price cannot be negative');
    }
    const minPriceCents = Math.min(...input.ticketTypes.map((type) => type.priceCents));

    const event = await prisma.event.create({
      data: {
        organizerId,
        title: input.title,
        description: input.description,
        category: input.category,
        venue: input.venue,
        addressLine: input.addressLine,
        city: input.city,
        state: input.state,
        country: input.country ?? 'IN',
        latitude: input.latitude,
        longitude: input.longitude,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        priceCents: input.priceCents ?? minPriceCents,
        currency: input.currency ?? 'INR',
        capacity: input.capacity,
        bannerUrl: input.bannerUrl,
        status: input.status ?? EventStatus.DRAFT,
        images: input.images?.length
          ? { create: input.images.map((url, position) => ({ url, position })) }
          : undefined,
        ticketTypes: {
          create: input.ticketTypes.map((type, position) => ({
            name: type.name,
            description: type.description,
            priceCents: type.priceCents,
            position,
          })),
        },
      },
      include: { images: true, ticketTypes: { orderBy: { position: 'asc' } } },
    });
    return event;
  },

  async update(eventId: string, requesterId: string, requesterRole: Role, patch: Partial<CreateEventInput>) {
    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) throw HttpError.notFound('Event not found');
    if (requesterRole !== Role.ADMIN && existing.organizerId !== requesterId) {
      throw HttpError.forbidden('Not your event');
    }
    const data: Prisma.EventUpdateInput = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.category !== undefined) data.category = patch.category;
    if (patch.venue !== undefined) data.venue = patch.venue;
    if (patch.addressLine !== undefined) data.addressLine = patch.addressLine;
    if (patch.city !== undefined) data.city = patch.city;
    if (patch.state !== undefined) data.state = patch.state;
    if (patch.country !== undefined) data.country = patch.country;
    if (patch.latitude !== undefined) data.latitude = patch.latitude;
    if (patch.longitude !== undefined) data.longitude = patch.longitude;
    if (patch.startAt !== undefined) data.startAt = new Date(patch.startAt);
    if (patch.endAt !== undefined) data.endAt = new Date(patch.endAt);
    if (patch.priceCents !== undefined) data.priceCents = patch.priceCents;
    if (patch.currency !== undefined) data.currency = patch.currency;
    if (patch.capacity !== undefined) data.capacity = patch.capacity;
    if (patch.bannerUrl !== undefined) data.bannerUrl = patch.bannerUrl;
    if (patch.status !== undefined) data.status = patch.status;

    const updated = await prisma.$transaction(async (tx) => {
      if (patch.ticketTypes) {
        if (!patch.ticketTypes.length) {
          throw HttpError.validation('At least one ticket type is required');
        }
        if (patch.ticketTypes.some((type) => type.priceCents < 0)) {
          throw HttpError.validation('ticket type price cannot be negative');
        }
        await tx.eventTicketType.deleteMany({ where: { eventId } });
        data.ticketTypes = {
          create: patch.ticketTypes.map((type, position) => ({
            name: type.name,
            description: type.description,
            priceCents: type.priceCents,
            position,
          })),
        };
        data.priceCents = Math.min(...patch.ticketTypes.map((type) => type.priceCents));
      }

      return tx.event.update({
        where: { id: eventId },
        data,
        include: { images: true, ticketTypes: { orderBy: { position: 'asc' } } },
      });
    });
    await redis.del(redisKeys.eventDetail(eventId));
    return updated;
  },

  async get(eventId: string) {
    const cached = await redis.get(redisKeys.eventDetail(eventId));
    if (cached) return JSON.parse(cached);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        images: { orderBy: { position: 'asc' } },
        ticketTypes: { orderBy: { position: 'asc' } },
        organizer: { select: { id: true, name: true, companyName: true } },
      },
    });
    if (!event) throw HttpError.notFound('Event not found');
    await redis.set(redisKeys.eventDetail(eventId), JSON.stringify(event), 'EX', 120);
    return event;
  },

  async list(input: ListEventsInput) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, input.pageSize ?? 12);

    const key = listCacheKey({ ...input, page, pageSize });
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    const where: Prisma.EventWhereInput = {
      status: input.status ?? EventStatus.PUBLISHED,
      ...(input.organizerId ? { organizerId: input.organizerId } : {}),
      ...(input.city ? { city: { equals: input.city, mode: 'insensitive' } } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q, mode: 'insensitive' } },
              { description: { contains: input.q, mode: 'insensitive' } },
              { venue: { contains: input.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(input.fromDate || input.toDate
        ? {
            startAt: {
              ...(input.fromDate ? { gte: new Date(input.fromDate) } : {}),
              ...(input.toDate ? { lte: new Date(input.toDate) } : {}),
            },
          }
        : {}),
    };

    const [total, items] = await prisma.$transaction([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          ticketTypes: { orderBy: { position: 'asc' } },
        },
        orderBy: [{ startAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const result = { total, page, pageSize, items };
    await redis.set(key, JSON.stringify(result), 'EX', 60);
    return result;
  },

  async listCities() {
    const rows = await prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });
    return rows.map((r) => r.city);
  },

  async attachImage(eventId: string, url: string, organizerId: string, role: Role) {
    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) throw HttpError.notFound('Event not found');
    if (role !== Role.ADMIN && existing.organizerId !== organizerId) {
      throw HttpError.forbidden('Not your event');
    }
    const position = await prisma.eventImage.count({ where: { eventId } });
    const image = await prisma.eventImage.create({ data: { eventId, url, position } });
    if (!existing.bannerUrl) {
      await prisma.event.update({ where: { id: eventId }, data: { bannerUrl: url } });
    }
    await redis.del(redisKeys.eventDetail(eventId));
    return image;
  },
};
