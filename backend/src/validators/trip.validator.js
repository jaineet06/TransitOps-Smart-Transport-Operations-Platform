import { z } from 'zod';
import { decimalField, paginationQuerySchema, positiveDecimalField } from './common.validator.js';

const tripStatusEnum = z.enum(['Draft', 'Dispatched', 'Completed', 'Cancelled']);

export const createTripSchema = z.object({
    source: z.string().trim().min(1, 'Source is required'),
    destination: z.string().trim().min(1, 'Destination is required'),
    vehicleId: z.string().trim().min(1, 'Vehicle ID is required'),
    driverId: z.string().trim().min(1, 'Driver ID is required'),
    cargoWeight: positiveDecimalField,
    plannedDistance: positiveDecimalField,
    revenue: decimalField.optional(),
});

export const completeTripSchema = z.object({
    finalOdometer: positiveDecimalField,
    fuelConsumed: positiveDecimalField,
    actualDistance: positiveDecimalField.optional(),
    revenue: decimalField.optional(),
});

export const listTripsQuerySchema = paginationQuerySchema.extend({
    status: tripStatusEnum.optional(),
    vehicleId: z.string().trim().min(1).optional(),
    driverId: z.string().trim().min(1).optional(),
    sortBy: z.enum(['createdAt', 'status', 'draftedAt', 'dispatchedAt', 'completedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});
