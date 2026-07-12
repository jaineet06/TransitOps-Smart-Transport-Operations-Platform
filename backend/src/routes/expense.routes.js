import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateQuery } from '../middlewares/validateQuery.middleware.js';
import { createExpenseSchema, listExpensesQuerySchema } from '../validators/expense.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listExpensesQuerySchema), expenseController.list);
router.post('/', requireRole('FinancialAnalyst'), validate(createExpenseSchema), expenseController.create);

export default router;
