import { z } from 'zod';
import { decimalField, paginationQuerySchema, positiveDecimalField } from './common.validator.js';

const vehicleStatusEnum = z.enum(['Available', 'OnTrip', 'InShop', 'Retired']);

export const createVehicleSchema = z.object({
    registrationNumber: z.string().trim().min(1, 'Registration number is required'),
    name: z.string().trim().min(1, 'Name is required'),
    model: z.string().trim().min(1, 'Model is required'),
    type: z.string().trim().min(1, 'Type is required'),
    maxLoadCapacity: positiveDecimalField,
    odometer: decimalField.optional(),
    acquisitionCost: positiveDecimalField,
    status: vehicleStatusEnum.optional(),
});

export const updateVehicleSchema = z
    .object({
        registrationNumber: z.string().trim().min(1).optional(),
        name: z.string().trim().min(1).optional(),
        model: z.string().trim().min(1).optional(),
        type: z.string().trim().min(1).optional(),
        maxLoadCapacity: positiveDecimalField.optional(),
        odometer: decimalField.optional(),
        acquisitionCost: positiveDecimalField.optional(),
        status: vehicleStatusEnum.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided for update',
    });

export const listVehiclesQuerySchema = paginationQuerySchema.extend({
    status: vehicleStatusEnum.optional(),
    type: z.string().trim().min(1).optional(),
    region: z.string().trim().min(1).optional(),
    sortBy: z.enum(['createdAt', 'registrationNumber', 'name', 'status', 'odometer']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const availableVehiclesQuerySchema = paginationQuerySchema.extend({
    type: z.string().trim().min(1).optional(),
    region: z.string().trim().min(1).optional(),
    sortBy: z.enum(['createdAt', 'registrationNumber', 'name']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});
