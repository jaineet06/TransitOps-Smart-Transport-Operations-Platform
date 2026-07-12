import prisma from '../configs/db.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination, buildPaginationMeta, parseSort } from '../utils/pagination.util.js';
import { serializeDecimals } from '../utils/decimal.util.js';

const FUEL_LOG_SORT_FIELDS = ['createdAt', 'date', 'cost', 'liters'];

function buildDateRangeFilter(startDate, endDate) {
    if (!startDate && !endDate) {
        return {};
    }

    const dateFilter = {};

    if (startDate) {
        dateFilter.gte = startDate;
    }

    if (endDate) {
        dateFilter.lte = endDate;
    }

    return { date: dateFilter };
}

async function assertVehicleExists(vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });

    if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
    }

    return vehicle;
}

export async function create(data) {
    await assertVehicleExists(data.vehicleId);

    const fuelLog = await prisma.fuelLog.create({
        data: {
            vehicleId: data.vehicleId,
            liters: data.liters,
            cost: data.cost,
            date: data.date,
        },
        include: {
            vehicle: { select: { id: true, registrationNumber: true, name: true } },
        },
    });

    return serializeDecimals(fuelLog);
}

export async function list(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {
        ...buildDateRangeFilter(query.startDate, query.endDate),
    };

    if (query.vehicleId) {
        where.vehicleId = query.vehicleId;
    }

    const orderBy = parseSort(query, FUEL_LOG_SORT_FIELDS);

    const [items, total] = await Promise.all([
        prisma.fuelLog.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                vehicle: { select: { id: true, registrationNumber: true, name: true } },
            },
        }),
        prisma.fuelLog.count({ where }),
    ]);

    return {
        items: serializeDecimals(items),
        pagination: buildPaginationMeta(total, page, limit),
    };
}
