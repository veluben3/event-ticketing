import { Router } from 'express';
import { Role } from '@prisma/client';
import { eventsController } from '../controllers/events.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Public (B2C browsing)
router.get('/', asyncHandler(eventsController.list));
router.get('/semantic-search', asyncHandler(eventsController.semanticSearch));
router.get('/cities', asyncHandler(eventsController.cities));
router.get('/mine', requireAuth, requireRole(Role.ORGANIZER, Role.ADMIN), asyncHandler(eventsController.mine));
router.get('/:id', asyncHandler(eventsController.get));

// B2B organizer-only
router.post(
  '/',
  requireAuth,
  requireRole(Role.ORGANIZER, Role.ADMIN),
  asyncHandler(eventsController.create),
);
router.patch(
  '/:id',
  requireAuth,
  requireRole(Role.ORGANIZER, Role.ADMIN),
  asyncHandler(eventsController.update),
);

export default router;
