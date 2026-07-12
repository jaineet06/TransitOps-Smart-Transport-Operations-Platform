import prisma from '../configs/db.js';

/**
 * Get drivers whose licenses have expired or will expire within 30 days.
 * @returns {Promise<Array>} Array of license alerts
 */
export async function getLicenseAlerts() {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const drivers = await prisma.driver.findMany({
        where: {
            licenseExpiryDate: {
                lte: thirtyDaysFromNow,
            },
        },
        orderBy: {
            licenseExpiryDate: 'asc',
        },
    });

    return drivers.map((driver) => {
        const expiry = new Date(driver.licenseExpiryDate);
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let severity;
        let text;
        if (diffTime <= 0) {
            severity = 'expired';
            text = `${driver.name}'s license has expired`;
        } else {
            severity = 'expiring soon';
            text = `${driver.name}'s license expires in ${diffDays} days`;
        }

        return {
            id: `license-${driver.id}`,
            driverId: driver.id,
            driverName: driver.name,
            driverEmail: driver.email,
            licenseNumber: driver.licenseNumber,
            licenseExpiryDate: driver.licenseExpiryDate,
            daysRemaining: diffTime <= 0 ? 0 : diffDays,
            severity,
            text,
            type: 'license',
        };
    });
}

/**
 * Get vehicles due for maintenance (not InShop or Retired, and > 90 days since last service/creation).
 * @returns {Promise<Array>} Array of maintenance due alerts
 */
export async function getMaintenanceAlerts() {
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const vehicles = await prisma.vehicle.findMany({
        where: {
            status: {
                notIn: ['InShop', 'Retired'],
            },
            OR: [
                {
                    createdAt: { lt: ninetyDaysAgo },
                    maintenanceLogs: { none: {} },
                },
                {
                    maintenanceLogs: {
                        some: {},
                        every: {
                            endDate: { lt: ninetyDaysAgo },
                        },
                    },
                },
            ],
        },
        include: {
            maintenanceLogs: {
                orderBy: { endDate: 'desc' },
                take: 1,
            },
        },
    });

    return vehicles.map((vehicle) => {
        const lastLog = vehicle.maintenanceLogs[0];
        const referenceDate = lastLog?.endDate ? new Date(lastLog.endDate) : new Date(vehicle.createdAt);
        const diffTime = now - referenceDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return {
            id: `maintenance-${vehicle.id}`,
            vehicleId: vehicle.id,
            registrationNumber: vehicle.registrationNumber,
            vehicleName: vehicle.name,
            lastServiceDate: lastLog?.endDate || null,
            daysSinceService: diffDays,
            severity: 'warning',
            text: `${vehicle.registrationNumber} is due for maintenance (${diffDays} days since last service)`,
            type: 'maintenance',
        };
    });
}

/**
 * Get active dispatched trips that are delayed.
 * Elapsed time > (plannedDistance / 40) * 1.5
 */
export async function getTripDelayAlerts() {
    const now = new Date();
    const dispatchedTrips = await prisma.trip.findMany({
        where: {
            status: 'Dispatched',
        },
    });

    const alerts = [];

    for (const trip of dispatchedTrips) {
        if (!trip.dispatchedAt) continue;

        const plannedDistance = parseFloat(trip.plannedDistance);
        const estimatedHours = plannedDistance / 40;
        const estimatedMs = estimatedHours * 60 * 60 * 1000;
        const elapsedTime = now - new Date(trip.dispatchedAt);

        if (elapsedTime > estimatedMs * 1.5) {
            alerts.push({
                id: `trip-delay-${trip.id}`,
                tripId: trip.id,
                text: `Trip ${trip.id} is running longer than expected`,
                severity: 'warning',
                type: 'trip-delay',
            });
        }
    }

    return alerts;
}

/**
 * Warns if fleet utilization is below 40%.
 */
export async function getUtilizationAlerts() {
    const [onTripCount, nonRetiredCount] = await Promise.all([
        prisma.vehicle.count({ where: { status: 'OnTrip' } }),
        prisma.vehicle.count({ where: { status: { not: 'Retired' } } }),
    ]);

    const utilization = nonRetiredCount === 0 ? 0 : (onTripCount / nonRetiredCount) * 100;
    const alerts = [];

    if (utilization < 40) {
        alerts.push({
            id: 'utilization-alert',
            text: 'Fleet utilization is below 40% — consider reviewing idle vehicles',
            severity: 'warning',
            type: 'utilization',
        });
    }

    return alerts;
}

/**
 * Get notification summary for counts and alert details.
 * @returns {Promise<Object>} Object containing counts and arrays of alerts
 */
export async function getNotifications() {
    const [licenseAlerts, maintenanceAlerts, tripDelayAlerts, utilizationAlerts] = await Promise.all([
        getLicenseAlerts(),
        getMaintenanceAlerts(),
        getTripDelayAlerts(),
        getUtilizationAlerts(),
    ]);

    const totalCount =
        licenseAlerts.length +
        maintenanceAlerts.length +
        tripDelayAlerts.length +
        utilizationAlerts.length;

    return {
        licenseAlerts,
        maintenanceAlerts,
        tripDelayAlerts,
        utilizationAlerts,
        totalCount,
    };
}
