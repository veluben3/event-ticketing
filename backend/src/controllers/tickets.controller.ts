import type { Request, Response } from 'express';
import { z } from 'zod';
import { ticketsService } from '../services/tickets.service';
import { HttpError } from '../utils/httpError';
import { slidingWindowAllow } from '../utils/rateLimiter';
import { redisKeys } from '../config/redis';

const purchaseSchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});

export const ticketsController = {
  async purchase(req: Request, res: Response) {
    if (!req.user) throw HttpError.unauthorized();

    const allowed = await slidingWindowAllow(redisKeys.rlPurchase(req.user.sub), 60_000, 10);
    if (!allowed) throw HttpError.rateLimited('Too many purchase attempts');

    const body = purchaseSchema.parse(req.body);
    const idempotencyKey = req.header('idempotency-key') ?? undefined;

    const result = await ticketsService.purchase(req.user.sub, { ...body, idempotencyKey });
    res.status(202).json(result);
  },

  async list(req: Request, res: Response) {
    if (!req.user) throw HttpError.unauthorized();
    const page = Number(req.query.page ?? 1);
    const pageSize = Math.min(50, Number(req.query.pageSize ?? 20));
    const data = await ticketsService.listForUser(req.user.sub, page, pageSize);
    res.json(data);
  },

  async get(req: Request, res: Response) {
    if (!req.user) throw HttpError.unauthorized();
    const ticket = await ticketsService.getForUser(req.user.sub, req.params.id);
    res.json({ ticket });
  },

  async organizerSales(req: Request, res: Response) {
    if (!req.user) throw HttpError.unauthorized();
    const items = await ticketsService.salesForOrganizer(req.user.sub);
    res.json({ items });
  },
};
