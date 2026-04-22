import { Router } from 'express';
import authRoutes from './auth.routes';
import eventsRoutes from './events.routes';
import ticketsRoutes from './tickets.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'events-manage-backend', timestamp: Date.now() }),
);

router.use('/auth', authRoutes);
router.use('/events', eventsRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/upload', uploadRoutes);

export default router;
