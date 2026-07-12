import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema, refreshSchema } from '../validators/auth.validator.js';
import { authLimiter } from '../middlewares/authRateLimiter.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
