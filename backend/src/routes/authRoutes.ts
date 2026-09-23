import { Router } from 'express';
import {
  authController,
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validateMiddleware';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.me);
router.put('/profile', authMiddleware, validate(updateProfileSchema), authController.updateProfile);

export const authRoutes = router;
