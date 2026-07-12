import { Router } from 'express';
import * as fuelLogController from '../controllers/fuelLog.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateQuery } from '../middlewares/validateQuery.middleware.js';
import { createFuelLogSchema, listFuelLogsQuerySchema } from '../validators/fuelLog.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listFuelLogsQuerySchema), fuelLogController.list);
router.post('/', requireRole('FinancialAnalyst'), validate(createFuelLogSchema), fuelLogController.create);

export default router;
