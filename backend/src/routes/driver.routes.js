import { Router } from 'express';
import * as driverController from '../controllers/driver.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateQuery } from '../middlewares/validateQuery.middleware.js';
import { validateParams } from '../middlewares/validateParams.middleware.js';
import {
    createDriverSchema,
    updateDriverSchema,
    listDriversQuerySchema,
    availableDriversQuerySchema,
} from '../validators/driver.validator.js';
import { idParamSchema } from '../validators/common.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listDriversQuerySchema), driverController.list);
router.get('/available', validateQuery(availableDriversQuerySchema), driverController.listAvailable);
router.get('/:id', validateParams(idParamSchema), driverController.getById);

router.post('/', requireRole('SafetyOfficer'), validate(createDriverSchema), driverController.create);
router.put('/:id', requireRole('SafetyOfficer'), validateParams(idParamSchema), validate(updateDriverSchema), driverController.update);
router.delete('/:id', requireRole('SafetyOfficer'), validateParams(idParamSchema), driverController.remove);

export default router;
