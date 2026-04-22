import { Router } from 'express';
import { Role } from '@prisma/client';
import { ticketsController } from '../controllers/tickets.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/purchase', requireAuth, asyncHandler(ticketsController.purchase));
router.get('/', requireAuth, asyncHandler(ticketsController.list));
router.get(
  '/organizer/sales',
  requireAuth,
  requireRole(Role.ORGANIZER, Role.ADMIN),
  asyncHandler(ticketsController.organizerSales),
);
router.get('/:id', requireAuth, asyncHandler(ticketsController.get));

export default router;
