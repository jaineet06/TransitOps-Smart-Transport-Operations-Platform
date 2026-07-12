import { Router } from 'express';
import * as tripController from '../controllers/trip.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateQuery } from '../middlewares/validateQuery.middleware.js';
import { validateParams } from '../middlewares/validateParams.middleware.js';
import { createTripSchema, completeTripSchema, listTripsQuerySchema } from '../validators/trip.validator.js';
import { idParamSchema } from '../validators/common.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listTripsQuerySchema), tripController.list);
router.get('/:id', validateParams(idParamSchema), tripController.getById);

router.post('/', requireRole('Dispatcher'), validate(createTripSchema), tripController.create);
router.patch('/:id/dispatch', requireRole('Dispatcher'), validateParams(idParamSchema), tripController.dispatch);
router.patch('/:id/complete', requireRole('Dispatcher'), validateParams(idParamSchema), validate(completeTripSchema), tripController.complete);
router.patch('/:id/cancel', requireRole('Dispatcher'), validateParams(idParamSchema), tripController.cancel);

export default router;
