import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// Require authentication for all notification routes
router.use(authenticate);

// GET /api/v1/notifications — returns computed alert panel lists and count
router.get('/', notificationController.getNotifications);

// POST /api/v1/notifications/license-reminders/send — triggers compliance reminder to SafetyOfficer email
router.post('/license-reminders/send', requireRole('SafetyOfficer'), notificationController.sendLicenseReminders);

export default router;
