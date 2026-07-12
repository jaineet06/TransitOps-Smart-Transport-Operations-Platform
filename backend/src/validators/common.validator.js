import { z } from 'zod';

export const idParamSchema = z.object({
    id: z.string().trim().min(1, 'ID is required'),
});

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const decimalField = z
    .union([z.number(), z.string()])
    .transform((val) => String(val))
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Must be a non-negative number',
    });

export const positiveDecimalField = decimalField.refine((val) => Number(val) > 0, {
    message: 'Must be a positive number',
});

export const dateField = z.coerce.date({ invalid_type_error: 'Invalid date' });

export const ALL_ROLES = ['FleetManager', 'Dispatcher', 'SafetyOfficer', 'FinancialAnalyst'];
