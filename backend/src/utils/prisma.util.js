import { AppError } from './AppError.js';

export function handlePrismaError(err, fieldMessages = {}) {
    if (err.code === 'P2002') {
        const target = err.meta?.target;

        if (Array.isArray(target)) {
            for (const field of target) {
                if (fieldMessages[field]) {
                    throw new AppError(fieldMessages[field], 409);
                }
            }
        }

        throw new AppError('A record with this value already exists', 409);
    }

    if (err.code === 'P2025') {
        throw new AppError('Record not found', 404);
    }

    throw err;
}
