import type { Request, Response } from 'express';
import { z } from 'zod';
import { EventCategory, EventStatus } from '@prisma/client';
import { eventsService } from '../services/events.service';
import { HttpError } from '../utils/httpError';

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  category: z.nativeEnum(EventCategory),
  venue: z.string().min(2).max(200),
  addressLine: z.string().max(300).optional(),
  city: z.string().min(2).max(100),
  state: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  currency: z.string().length(3).optional(),
  capacity: z.number().int().positive(),
  bannerUrl: z.string().url().optional(),
  images: z.array(z.string().url()).max(10).optional(),
  ticketTypes: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        priceCents: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(10),
  status: z.nativeEnum(EventStatus).optional(),
});

const updateSchema = createSchema.partial();

const listSchema = z.object({
  city: z.preprocess(
    (v) => (v === '' || v === null || v === 'undefined' ? undefined : v),
    z.string().optional(),
  ),
  category: z.preprocess(
    (v) => (v === '' || v === null || v === 'undefined' ? undefined : v),
    z.nativeEnum(EventCategory).optional(),
  ),
  q: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  organizerId: z.string().optional(),
});

const aiSearchSchema = z.object({
  q: z.string().min(1),
  city: z.preprocess(
    (v) => (v === '' || v === null || v === 'undefined' ? undefined : v),
    z.string().optional(),
  ),
  category: z.preprocess(
    (v) => (v === '' || v === null || v === 'undefined' ? undefined : v),
    z.nativeEnum(EventCategory).optional(),
  ),
  topK: z.coerce.number().int().positive().max(24).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export const eventsController = {
  async create(req: Request, res: Response) {
    if (!req.user) throw HttpError.unauthorized();
    const body = createSchema.parse(req.body);
    const event = await eventsService.create(req.user.sub, body);
    res.status(201).json({ event });
  },

  async update(req: Request, res: Response) {
    if (!req.user) throw HttpError.unauthorized();
    const body = updateSchema.parse(req.body);
    const event = await eventsService.update(req.params.id, req.user.sub, req.user.role, body);
    res.json({ event });
  },

  async list(req: Request, res: Response) {
    const query = listSchema.parse(req.query);
    const result = await eventsService.list(query);
    res.json(result);
  },

  async semanticSearch(req: Request, res: Response) {
    const query = aiSearchSchema.parse(req.query);
    const result = await eventsService.semanticSearch(query);
    res.json(result);
  },

  async mine(req: Request, res: Response) {
    if (!req.user) throw HttpError.unauthorized();
    const query = listSchema.parse(req.query);
    const result = await eventsService.list({ ...query, organizerId: req.user.sub, status: query.status });
    res.json(result);
  },

  async get(req: Request, res: Response) {
    const event = await eventsService.get(req.params.id);
    res.json({ event });
  },

  async cities(_req: Request, res: Response) {
    const cities = await eventsService.listCities();
    res.json({ cities });
  },
};
