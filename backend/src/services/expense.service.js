import prisma from '../configs/db.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination, buildPaginationMeta, parseSort } from '../utils/pagination.util.js';
import { serializeDecimals } from '../utils/decimal.util.js';

const EXPENSE_SORT_FIELDS = ['createdAt', 'date', 'amount', 'type'];

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

    const expense = await prisma.expense.create({
        data: {
            vehicleId: data.vehicleId,
            type: data.type,
            amount: data.amount,
            date: data.date,
        },
        include: {
            vehicle: { select: { id: true, registrationNumber: true, name: true } },
        },
    });

    return serializeDecimals(expense);
}

export async function list(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {
        ...buildDateRangeFilter(query.startDate, query.endDate),
    };

    if (query.vehicleId) {
        where.vehicleId = query.vehicleId;
    }

    if (query.type) {
        where.type = query.type;
    }

    const orderBy = parseSort(query, EXPENSE_SORT_FIELDS);

    const [items, total] = await Promise.all([
        prisma.expense.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                vehicle: { select: { id: true, registrationNumber: true, name: true } },
            },
        }),
        prisma.expense.count({ where }),
    ]);

    return {
        items: serializeDecimals(items),
        pagination: buildPaginationMeta(total, page, limit),
    };
}
