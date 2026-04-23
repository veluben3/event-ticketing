import { EventStatus } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface AiIndexEventInput {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  addressLine?: string | null;
  city: string;
  state?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  startAt: Date | string;
  endAt: Date | string;
  priceCents: number;
  currency: string;
  status: string;
  organizerId: string;
  capacity: number;
  ticketsSold: number;
  bannerUrl?: string | null;
  images?: Array<{ id?: string; url: string; position?: number }>;
  ticketTypes?: Array<{ id?: string; name: string; description?: string | null; priceCents: number }>;
}

function normalizeEvent(event: AiIndexEventInput) {
  return {
    ...event,
    addressLine: event.addressLine ?? undefined,
    state: event.state ?? undefined,
    latitude: event.latitude ?? undefined,
    longitude: event.longitude ?? undefined,
    bannerUrl: event.bannerUrl ?? undefined,
    startAt: new Date(event.startAt).toISOString(),
    endAt: new Date(event.endAt).toISOString(),
    images: event.images ?? [],
    ticketTypes: event.ticketTypes ?? [],
  };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${env.aiBackendUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`AI backend ${response.status}: ${text || response.statusText}`);
  }

  return (await response.json()) as T;
}

export const aiSearchService = {
  async upsertEvent(event: AiIndexEventInput) {
    if (!env.aiBackendUrl) return;

    try {
      await postJson('/api/v1/index/upsert', { events: [normalizeEvent(event)] });
    } catch (err) {
      logger.warn({ err, eventId: event.id }, 'failed to upsert event into AI backend');
    }
  },

  async search(input: {
    query: string;
    city?: string;
    category?: string;
    topK?: number;
    status?: EventStatus | string;
    latitude?: number;
    longitude?: number;
  }) {
    if (!env.aiBackendUrl) {
      return { query: input.query, count: 0, results: [] as unknown[] };
    }

    return postJson<{
      query: string;
      answer?: string;
      count: number;
      results: unknown[];
    }>('/api/v1/search', {
      query: input.query,
      top_k: input.topK,
      latitude: input.latitude,
      longitude: input.longitude,
      filters: {
        city: input.city,
        category: input.category,
        status: input.status ?? EventStatus.PUBLISHED,
      },
    });
  },
};
