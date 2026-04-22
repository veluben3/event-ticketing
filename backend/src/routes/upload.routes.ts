import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { uploadController } from '../controllers/upload.controller';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole(Role.ORGANIZER, Role.ADMIN),
  upload.single('file'),
  asyncHandler(uploadController.single),
);

router.post(
  '/events/:eventId',
  requireAuth,
  requireRole(Role.ORGANIZER, Role.ADMIN),
  upload.single('file'),
  asyncHandler(uploadController.eventImage),
);

export default router;
