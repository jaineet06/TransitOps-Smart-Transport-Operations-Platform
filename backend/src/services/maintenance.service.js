import prisma from '../configs/db.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination, buildPaginationMeta, parseSort } from '../utils/pagination.util.js';
import { serializeDecimals } from '../utils/decimal.util.js';

const MAINTENANCE_SORT_FIELDS = ['createdAt', 'startDate', 'cost', 'status'];

export async function create(data) {
    return prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.findUnique({ where: { id: data.vehicleId } });

        if (!vehicle) {
            throw new AppError('Vehicle not found', 404);
        }

        if (vehicle.status === 'OnTrip') {
            throw new AppError('Cannot create maintenance for a vehicle that is currently on a trip', 400);
        }

        if (vehicle.status === 'Retired') {
            throw new AppError('Cannot create maintenance for a retired vehicle', 400);
        }

        const maintenance = await tx.maintenanceLog.create({
            data: {
                vehicleId: data.vehicleId,
                description: data.description,
                cost: data.cost,
                startDate: data.startDate,
                status: 'Active',
            },
            include: {
                vehicle: { select: { id: true, registrationNumber: true, name: true, status: true } },
            },
        });

        await tx.vehicle.update({
            where: { id: data.vehicleId },
            data: { status: 'InShop' },
        });

        return serializeDecimals(maintenance);
    });
}

export async function list(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};

    if (query.vehicleId) {
        where.vehicleId = query.vehicleId;
    }

    if (query.status) {
        where.status = query.status;
    }

    const orderBy = parseSort(query, MAINTENANCE_SORT_FIELDS);

    const [items, total] = await Promise.all([
        prisma.maintenanceLog.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                vehicle: { select: { id: true, registrationNumber: true, name: true, status: true } },
            },
        }),
        prisma.maintenanceLog.count({ where }),
    ]);

    return {
        items: serializeDecimals(items),
        pagination: buildPaginationMeta(total, page, limit),
    };
}

export async function getById(id) {
    const maintenance = await prisma.maintenanceLog.findUnique({
        where: { id },
        include: { vehicle: true },
    });

    if (!maintenance) {
        throw new AppError('Maintenance record not found', 404);
    }

    return serializeDecimals(maintenance);
}

export async function close(id) {
    return prisma.$transaction(async (tx) => {
        const maintenance = await tx.maintenanceLog.findUnique({
            where: { id },
            include: { vehicle: true },
        });

        if (!maintenance) {
            throw new AppError('Maintenance record not found', 404);
        }

        if (maintenance.status === 'Closed') {
            throw new AppError('Maintenance record is already closed', 400);
        }

        const now = new Date();

        const updatedMaintenance = await tx.maintenanceLog.update({
            where: { id },
            data: {
                status: 'Closed',
                endDate: now,
            },
            include: { vehicle: true },
        });

        if (maintenance.vehicle.status !== 'Retired') {
            await tx.vehicle.update({
                where: { id: maintenance.vehicleId },
                data: { status: 'Available' },
            });
        }

        const refreshed = await tx.maintenanceLog.findUnique({
            where: { id },
            include: { vehicle: true },
        });

        return serializeDecimals(refreshed ?? updatedMaintenance);
    });
}
