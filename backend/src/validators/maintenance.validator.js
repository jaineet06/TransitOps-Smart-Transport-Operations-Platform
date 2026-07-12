import { z } from 'zod';
import { dateField, paginationQuerySchema, positiveDecimalField } from './common.validator.js';

const maintenanceStatusEnum = z.enum(['Active', 'Closed']);

export const createMaintenanceSchema = z.object({
    vehicleId: z.string().trim().min(1, 'Vehicle ID is required'),
    description: z.string().trim().min(1, 'Description is required'),
    cost: positiveDecimalField,
    startDate: dateField,
});

export const listMaintenanceQuerySchema = paginationQuerySchema.extend({
    vehicleId: z.string().trim().min(1).optional(),
    status: maintenanceStatusEnum.optional(),
    sortBy: z.enum(['createdAt', 'startDate', 'cost', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});
