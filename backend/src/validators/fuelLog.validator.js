import { z } from 'zod';
import { dateField, decimalField, paginationQuerySchema, positiveDecimalField } from './common.validator.js';

export const createFuelLogSchema = z.object({
    vehicleId: z.string().trim().min(1, 'Vehicle ID is required'),
    liters: positiveDecimalField,
    cost: decimalField,
    date: dateField,
});

export const listFuelLogsQuerySchema = paginationQuerySchema.extend({
    vehicleId: z.string().trim().min(1).optional(),
    startDate: dateField.optional(),
    endDate: dateField.optional(),
    sortBy: z.enum(['createdAt', 'date', 'cost', 'liters']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});
