import prisma from '../configs/db.js';
import { AppError } from '../utils/AppError.js';
import { handlePrismaError } from '../utils/prisma.util.js';
import { parsePagination, buildPaginationMeta, parseSort } from '../utils/pagination.util.js';
import { serializeDecimals, sumDecimals, toDecimal } from '../utils/decimal.util.js';

const VEHICLE_SORT_FIELDS = ['createdAt', 'registrationNumber', 'name', 'status', 'odometer'];

function buildRegionFilter(region) {
    if (!region) {
        return {};
    }

    return {
        name: {
            contains: region,
            mode: 'insensitive',
        },
    };
}

function buildListWhere(query) {
    const where = {};

    if (query.status) {
        where.status = query.status;
    }

    if (query.type) {
        where.type = {
            equals: query.type,
            mode: 'insensitive',
        };
    }

    Object.assign(where, buildRegionFilter(query.region));

    return where;
}

export async function create(data) {
    try {
        const vehicle = await prisma.vehicle.create({
            data: {
                registrationNumber: data.registrationNumber,
                name: data.name,
                model: data.model,
                type: data.type,
                maxLoadCapacity: data.maxLoadCapacity,
                odometer: data.odometer ?? '0',
                acquisitionCost: data.acquisitionCost,
                status: data.status ?? 'Available',
            },
        });

        return serializeDecimals(vehicle);
    } catch (err) {
        handlePrismaError(err, {
            registrationNumber: 'A vehicle with this registration number already exists',
        });
    }
}

export async function list(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = buildListWhere(query);
    const orderBy = parseSort(query, VEHICLE_SORT_FIELDS);

    const [items, total] = await Promise.all([
        prisma.vehicle.findMany({ where, skip, take: limit, orderBy }),
        prisma.vehicle.count({ where }),
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
        ...buildListWhere({ type: query.type, region: query.region }),
    };
    const orderBy = parseSort(query, ['createdAt', 'registrationNumber', 'name']);

    const [items, total] = await Promise.all([
        prisma.vehicle.findMany({ where, skip, take: limit, orderBy }),
        prisma.vehicle.count({ where }),
    ]);

    return {
        items: serializeDecimals(items),
        pagination: buildPaginationMeta(total, page, limit),
    };
}

export async function getById(id) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });

    if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
    }

    return serializeDecimals(vehicle);
}

export async function update(id, data) {
    await getById(id);

    try {
        const vehicle = await prisma.vehicle.update({
            where: { id },
            data,
        });

        return serializeDecimals(vehicle);
    } catch (err) {
        handlePrismaError(err, {
            registrationNumber: 'A vehicle with this registration number already exists',
        });
    }
}

export async function remove(id) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });

    if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
    }

    const [activeTrips, activeMaintenance] = await Promise.all([
        prisma.trip.count({
            where: {
                vehicleId: id,
                status: { in: ['Draft', 'Dispatched'] },
            },
        }),
        prisma.maintenanceLog.count({
            where: {
                vehicleId: id,
                status: 'Active',
            },
        }),
    ]);

    if (activeTrips > 0 || activeMaintenance > 0) {
        throw new AppError(
            'Cannot delete vehicle with active trips or active maintenance records',
            409
        );
    }

    await prisma.vehicle.delete({ where: { id } });
}

export async function getTotalCost(id) {
    await getById(id);

    const [fuelAgg, maintenanceAgg] = await Promise.all([
        prisma.fuelLog.aggregate({
            where: { vehicleId: id },
            _sum: { cost: true },
        }),
        prisma.maintenanceLog.aggregate({
            where: { vehicleId: id },
            _sum: { cost: true },
        }),
    ]);

    const fuelCost = fuelAgg._sum.cost ?? toDecimal(0);
    const maintenanceCost = maintenanceAgg._sum.cost ?? toDecimal(0);
    const totalCost = sumDecimals([fuelCost, maintenanceCost]);

    return {
        vehicleId: id,
        fuelCost: serializeDecimals(fuelCost),
        maintenanceCost: serializeDecimals(maintenanceCost),
        totalCost: serializeDecimals(totalCost),
    };
}
