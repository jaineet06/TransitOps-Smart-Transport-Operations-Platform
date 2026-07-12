import { Router } from 'express';
import * as maintenanceController from '../controllers/maintenance.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateQuery } from '../middlewares/validateQuery.middleware.js';
import { validateParams } from '../middlewares/validateParams.middleware.js';
import { createMaintenanceSchema, listMaintenanceQuerySchema } from '../validators/maintenance.validator.js';
import { idParamSchema } from '../validators/common.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listMaintenanceQuerySchema), maintenanceController.list);
router.get('/:id', validateParams(idParamSchema), maintenanceController.getById);

router.post('/', requireRole('FleetManager'), validate(createMaintenanceSchema), maintenanceController.create);
router.patch('/:id/close', requireRole('FleetManager'), validateParams(idParamSchema), maintenanceController.close);

export default router;
