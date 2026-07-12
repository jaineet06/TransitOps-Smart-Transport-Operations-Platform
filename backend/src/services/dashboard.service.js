import prisma from '../configs/db.js';

export async function getKpis() {
    const [
        activeVehicles,
        availableVehicles,
        vehiclesInMaintenance,
        activeTrips,
        pendingTrips,
        driversOnDuty,
        onTripVehicleCount,
        nonRetiredVehicleCount,
    ] = await Promise.all([
        prisma.vehicle.count({
            where: { status: { in: ['Available', 'OnTrip', 'InShop'] } },
        }),
        prisma.vehicle.count({ where: { status: 'Available' } }),
        prisma.vehicle.count({ where: { status: 'InShop' } }),
        prisma.trip.count({ where: { status: 'Dispatched' } }),
        prisma.trip.count({ where: { status: 'Draft' } }),
        prisma.driver.count({
            where: {
                status: { in: ['Available', 'OnTrip'] },
            },
        }),
        prisma.vehicle.count({ where: { status: 'OnTrip' } }),
        prisma.vehicle.count({ where: { status: { not: 'Retired' } } }),
    ]);

    const fleetUtilization =
        nonRetiredVehicleCount === 0 ? 0 : Number(((onTripVehicleCount / nonRetiredVehicleCount) * 100).toFixed(2));

    return {
        activeVehicles,
        availableVehicles,
        vehiclesInMaintenance,
        activeTrips,
        pendingTrips,
        driversOnDuty,
        fleetUtilization,
    };
}
