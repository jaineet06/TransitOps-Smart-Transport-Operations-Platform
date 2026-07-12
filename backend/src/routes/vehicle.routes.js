import { Router } from 'express';
import * as vehicleController from '../controllers/vehicle.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateQuery } from '../middlewares/validateQuery.middleware.js';
import { validateParams } from '../middlewares/validateParams.middleware.js';
import {
    createVehicleSchema,
    updateVehicleSchema,
    listVehiclesQuerySchema,
    availableVehiclesQuerySchema,
} from '../validators/vehicle.validator.js';
import { idParamSchema } from '../validators/common.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listVehiclesQuerySchema), vehicleController.list);
router.get('/available', validateQuery(availableVehiclesQuerySchema), vehicleController.listAvailable);
router.get('/:id/total-cost', validateParams(idParamSchema), vehicleController.getTotalCost);
router.get('/:id', validateParams(idParamSchema), vehicleController.getById);

router.post('/', requireRole('FleetManager'), validate(createVehicleSchema), vehicleController.create);
router.put('/:id', requireRole('FleetManager'), validateParams(idParamSchema), validate(updateVehicleSchema), vehicleController.update);
router.delete('/:id', requireRole('FleetManager'), validateParams(idParamSchema), vehicleController.remove);

export default router;
