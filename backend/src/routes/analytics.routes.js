import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validateQuery } from '../middlewares/validateQuery.middleware.js';
import { exportCsvQuerySchema } from '../validators/analytics.validator.js';

const router = Router();

const analyticsRoles = requireRole('FinancialAnalyst', 'FleetManager');

router.use(authenticate);

router.get('/fuel-efficiency', analyticsRoles, analyticsController.getFuelEfficiency);
router.get('/fleet-utilization', analyticsRoles, analyticsController.getFleetUtilization);
router.get('/operational-cost', analyticsRoles, analyticsController.getOperationalCost);
router.get('/vehicle-roi', analyticsRoles, analyticsController.getVehicleRoi);
router.get('/export/csv', analyticsRoles, validateQuery(exportCsvQuerySchema), analyticsController.exportCsv);

export default router;
