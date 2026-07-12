import { z } from 'zod';
import { paginationQuerySchema } from './common.validator.js';

const driverStatusEnum = z.enum(['Available', 'OnTrip', 'OffDuty', 'Suspended']);

export const createDriverSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    licenseNumber: z.string().trim().min(1, 'License number is required'),
    licenseCategory: z.string().trim().min(1, 'License category is required'),
    licenseExpiryDate: z.coerce
        .date({ invalid_type_error: 'Invalid license expiry date' })
        .refine((date) => date > new Date(), {
            message: 'License expiry date must be in the future',
        }),
    contactNumber: z.string().trim().min(1, 'Contact number is required'),
    safetyScore: z.coerce.number().int().min(0).max(100).optional(),
    status: driverStatusEnum.optional(),
});

export const updateDriverSchema = z
    .object({
        name: z.string().trim().min(1).optional(),
        licenseNumber: z.string().trim().min(1).optional(),
        licenseCategory: z.string().trim().min(1).optional(),
        licenseExpiryDate: z.coerce.date({ invalid_type_error: 'Invalid license expiry date' }).optional(),
        contactNumber: z.string().trim().min(1).optional(),
        safetyScore: z.coerce.number().int().min(0).max(100).optional(),
        status: driverStatusEnum.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided for update',
    });

export const listDriversQuerySchema = paginationQuerySchema.extend({
    status: driverStatusEnum.optional(),
    licenseCategory: z.string().trim().min(1).optional(),
    sortBy: z.enum(['createdAt', 'name', 'licenseExpiryDate', 'safetyScore', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const availableDriversQuerySchema = paginationQuerySchema.extend({
    licenseCategory: z.string().trim().min(1).optional(),
    sortBy: z.enum(['createdAt', 'name', 'licenseExpiryDate']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});
