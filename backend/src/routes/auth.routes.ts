import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', requireAuth, asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.get('/locations', requireAuth, asyncHandler(authController.listLocations));
router.post('/locations', requireAuth, asyncHandler(authController.createLocation));
router.patch('/locations/:id', requireAuth, asyncHandler(authController.updateLocation));
router.delete('/locations/:id', requireAuth, asyncHandler(authController.deleteLocation));

export default router;
