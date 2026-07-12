import prisma from '../configs/db.js';
import { AppError } from '../utils/AppError.js';
import { parsePagination, buildPaginationMeta, parseSort } from '../utils/pagination.util.js';
import { serializeDecimals, toDecimal } from '../utils/decimal.util.js';

const TRIP_SORT_FIELDS = ['createdAt', 'status', 'draftedAt', 'dispatchedAt', 'completedAt'];

const VALID_TRANSITIONS = {
    Draft: ['Dispatched', 'Cancelled'],
    Dispatched: ['Completed', 'Cancelled'],
    Completed: [],
    Cancelled: [],
};

function assertTransition(currentStatus, nextStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(nextStatus)) {
        throw new AppError(
            `Invalid trip status transition: cannot move from ${currentStatus} to ${nextStatus}`,
            400
        );
    }
}

function validateDriverEligibility(driver) {
    if (!driver) {
        throw new AppError('Driver not found', 404);
    }

    if (driver.status === 'Suspended') {
        throw new AppError('Driver is suspended and cannot be assigned to a trip', 400);
    }

    if (driver.status !== 'Available') {
        throw new AppError('Driver is not available for assignment', 400);
    }

    if (driver.licenseExpiryDate <= new Date()) {
        throw new AppError('Driver license has expired', 400);
    }
}

function validateVehicleAvailability(vehicle) {
    if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
    }

    if (vehicle.status !== 'Available') {
        throw new AppError('Vehicle is not available for assignment', 400);
    }
}

function validateCargoWeight(cargoWeight, maxLoadCapacity) {
    if (toDecimal(cargoWeight).greaterThan(toDecimal(maxLoadCapacity))) {
        throw new AppError('Cargo weight exceeds vehicle maximum load capacity', 400);
    }
}

export async function create(data) {
    return prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.findUnique({ where: { id: data.vehicleId } });
        const driver = await tx.driver.findUnique({ where: { id: data.driverId } });

        validateVehicleAvailability(vehicle);
        validateDriverEligibility(driver);
        validateCargoWeight(data.cargoWeight, vehicle.maxLoadCapacity);

        const trip = await tx.trip.create({
            data: {
                source: data.source,
                destination: data.destination,
                vehicleId: data.vehicleId,
                driverId: data.driverId,
                cargoWeight: data.cargoWeight,
                plannedDistance: data.plannedDistance,
                revenue: data.revenue,
                status: 'Draft',
            },
            include: { vehicle: true, driver: true },
        });

        return serializeDecimals(trip);
    });
}

export async function list(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};

    if (query.status) {
        where.status = query.status;
    }

    if (query.vehicleId) {
        where.vehicleId = query.vehicleId;
    }

    if (query.driverId) {
        where.driverId = query.driverId;
    }

    const orderBy = parseSort(query, TRIP_SORT_FIELDS);

    const [items, total] = await Promise.all([
        prisma.trip.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                vehicle: { select: { id: true, registrationNumber: true, name: true, status: true } },
                driver: { select: { id: true, name: true, licenseNumber: true, status: true } },
            },
        }),
        prisma.trip.count({ where }),
    ]);

    return {
        items: serializeDecimals(items),
        pagination: buildPaginationMeta(total, page, limit),
    };
}

export async function getById(id) {
    const trip = await prisma.trip.findUnique({
        where: { id },
        include: {
            vehicle: true,
            driver: true,
        },
    });

    if (!trip) {
        throw new AppError('Trip not found', 404);
    }

    return serializeDecimals(trip);
}

export async function dispatch(id) {
    return prisma.$transaction(async (tx) => {
        const trip = await tx.trip.findUnique({ where: { id } });

        if (!trip) {
            throw new AppError('Trip not found', 404);
        }

        assertTransition(trip.status, 'Dispatched');

        const vehicle = await tx.vehicle.findUnique({ where: { id: trip.vehicleId } });
        const driver = await tx.driver.findUnique({ where: { id: trip.driverId } });

        validateVehicleAvailability(vehicle);
        validateDriverEligibility(driver);
        validateCargoWeight(trip.cargoWeight, vehicle.maxLoadCapacity);

        const now = new Date();

        const vehicleUpdate = await tx.vehicle.updateMany({
            where: { id: trip.vehicleId, status: 'Available' },
            data: { status: 'OnTrip' },
        });

        if (vehicleUpdate.count === 0) {
            throw new AppError('Failed to dispatch trip — vehicle is no longer available', 409);
        }

        const driverUpdate = await tx.driver.updateMany({
            where: { id: trip.driverId, status: 'Available' },
            data: { status: 'OnTrip' },
        });

        if (driverUpdate.count === 0) {
            throw new AppError('Failed to dispatch trip — driver is no longer available', 409);
        }

        const updatedTrip = await tx.trip.update({
            where: { id },
            data: {
                status: 'Dispatched',
                dispatchedAt: now,
            },
            include: { vehicle: true, driver: true },
        });

        return serializeDecimals(updatedTrip);
    });
}

export async function complete(id, data) {
    return prisma.$transaction(async (tx) => {
        const trip = await tx.trip.findUnique({
            where: { id },
            include: { vehicle: true },
        });

        if (!trip) {
            throw new AppError('Trip not found', 404);
        }

        assertTransition(trip.status, 'Completed');

        const finalOdometer = toDecimal(data.finalOdometer);
        const currentOdometer = toDecimal(trip.vehicle.odometer);

        if (finalOdometer.lessThan(currentOdometer)) {
            throw new AppError('Final odometer cannot be less than current vehicle odometer', 400);
        }

        const now = new Date();
        const actualDistance = data.actualDistance ?? finalOdometer.minus(currentOdometer).toString();

        const updatedTrip = await tx.trip.update({
            where: { id },
            data: {
                status: 'Completed',
                completedAt: now,
                fuelConsumed: data.fuelConsumed,
                actualDistance,
                revenue: data.revenue ?? trip.revenue,
            },
            include: { vehicle: true, driver: true },
        });

        await tx.vehicle.update({
            where: { id: trip.vehicleId },
            data: {
                status: 'Available',
                odometer: data.finalOdometer,
            },
        });

        await tx.driver.update({
            where: { id: trip.driverId },
            data: { status: 'Available' },
        });

        return serializeDecimals(updatedTrip);
    });
}

export async function cancel(id) {
    return prisma.$transaction(async (tx) => {
        const trip = await tx.trip.findUnique({ where: { id } });

        if (!trip) {
            throw new AppError('Trip not found', 404);
        }

        assertTransition(trip.status, 'Cancelled');

        const now = new Date();

        const updatedTrip = await tx.trip.update({
            where: { id },
            data: {
                status: 'Cancelled',
                cancelledAt: now,
            },
            include: { vehicle: true, driver: true },
        });

        if (trip.status === 'Dispatched') {
            await tx.vehicle.update({
                where: { id: trip.vehicleId },
                data: { status: 'Available' },
            });

            await tx.driver.update({
                where: { id: trip.driverId },
                data: { status: 'Available' },
            });
        }

        const refreshedTrip = await tx.trip.findUnique({
            where: { id },
            include: { vehicle: true, driver: true },
        });

        return serializeDecimals(refreshedTrip ?? updatedTrip);
    });
}
