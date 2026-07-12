import { z } from 'zod';
import { dateField, decimalField, paginationQuerySchema } from './common.validator.js';

const expenseTypeEnum = z.enum(['Toll', 'Other']);

export const createExpenseSchema = z.object({
    vehicleId: z.string().trim().min(1, 'Vehicle ID is required'),
    type: expenseTypeEnum,
    amount: decimalField,
    date: dateField,
});

export const listExpensesQuerySchema = paginationQuerySchema.extend({
    vehicleId: z.string().trim().min(1).optional(),
    type: expenseTypeEnum.optional(),
    startDate: dateField.optional(),
    endDate: dateField.optional(),
    sortBy: z.enum(['createdAt', 'date', 'amount', 'type']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});
