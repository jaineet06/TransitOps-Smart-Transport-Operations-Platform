import prisma from '../configs/db.js';
import { AppError } from '../utils/AppError.js';
import { handlePrismaError } from '../utils/prisma.util.js';
import { parsePagination, buildPaginationMeta, parseSort } from '../utils/pagination.util.js';
import { serializeDecimals } from '../utils/decimal.util.js';

const DRIVER_SORT_FIELDS = ['createdAt', 'name', 'licenseExpiryDate', 'safetyScore', 'status'];

function buildListWhere(query) {
    const where = {};

    if (query.status) {
        where.status = query.status;
    }

    if (query.licenseCategory) {
        where.licenseCategory = {
            equals: query.licenseCategory,
            mode: 'insensitive',
        };
    }

    return where;
}

export async function create(data) {
    try {
        const driver = await prisma.driver.create({
            data: {
                name: data.name,
                email: data.email,
                licenseNumber: data.licenseNumber,
                licenseCategory: data.licenseCategory,
                licenseExpiryDate: data.licenseExpiryDate,
                contactNumber: data.contactNumber,
                safetyScore: data.safetyScore ?? 100,
                status: data.status ?? 'Available',
            },
        });

        return serializeDecimals(driver);
    } catch (err) {
        handlePrismaError(err, {
            licenseNumber: 'A driver with this license number already exists',
            email: 'A driver with this email address already exists',
        });
    }
}

export async function list(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = buildListWhere(query);
    const orderBy = parseSort(query, DRIVER_SORT_FIELDS);

    const [items, total] = await Promise.all([
        prisma.driver.findMany({ where, skip, take: limit, orderBy }),
        prisma.driver.count({ where }),
    ]);

    return {
        items: serializeDecimals(items),
        pagination: buildPaginationMeta(total, page, limit),
    };
}

export async function listAvailable(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {
        status: 'Available',
        licenseExpiryDate: { gt: new Date() },
    };

    if (query.licenseCategory) {
        where.licenseCategory = {
            equals: query.licenseCategory,
            mode: 'insensitive',
        };
    }

    const orderBy = parseSort(query, ['createdAt', 'name', 'licenseExpiryDate']);

    const [items, total] = await Promise.all([
        prisma.driver.findMany({ where, skip, take: limit, orderBy }),
        prisma.driver.count({ where }),
    ]);

    return {
        items: serializeDecimals(items),
        pagination: buildPaginationMeta(total, page, limit),
    };
}

export async function getById(id) {
    const driver = await prisma.driver.findUnique({ where: { id } });

    if (!driver) {
        throw new AppError('Driver not found', 404);
    }

    return serializeDecimals(driver);
}

export async function update(id, data) {
    await getById(id);

    try {
        const driver = await prisma.driver.update({
            where: { id },
            data,
        });

        return serializeDecimals(driver);
    } catch (err) {
        handlePrismaError(err, {
            licenseNumber: 'A driver with this license number already exists',
            email: 'A driver with this email address already exists',
        });
    }
}

export async function remove(id) {
    const driver = await prisma.driver.findUnique({ where: { id } });

    if (!driver) {
        throw new AppError('Driver not found', 404);
    }

    const activeTrips = await prisma.trip.count({
        where: {
            driverId: id,
            status: { in: ['Draft', 'Dispatched'] },
        },
    });

    if (activeTrips > 0) {
        throw new AppError('Cannot delete driver with active trip references', 409);
    }

    await prisma.driver.delete({ where: { id } });
}
