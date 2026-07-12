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
 * Get notification summary for counts and alert details.
 * @returns {Promise<Object>} Object containing counts and arrays of alerts
 */
export async function getNotifications() {
    const [licenseAlerts, maintenanceAlerts] = await Promise.all([
        getLicenseAlerts(),
        getMaintenanceAlerts(),
    ]);

    const totalCount = licenseAlerts.length + maintenanceAlerts.length;

    return {
        licenseAlerts,
        maintenanceAlerts,
        totalCount,
    };
}
