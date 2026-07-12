import prisma from '../configs/db.js';
import { AppError } from '../utils/AppError.js';
import { serializeDecimals, sumDecimals, divideDecimals, toDecimal, decimalToNumber } from '../utils/decimal.util.js';
import { buildCsv } from '../utils/csv.util.js';

async function getAllNonRetiredVehicles() {
    return prisma.vehicle.findMany({
        where: { status: { not: 'Retired' } },
        select: {
            id: true,
            registrationNumber: true,
            name: true,
            acquisitionCost: true,
            status: true,
        },
    });
}

async function getCompletedTripAggregatesByVehicle() {
    const trips = await prisma.trip.groupBy({
        by: ['vehicleId'],
        where: { status: 'Completed' },
        _sum: {
            actualDistance: true,
            fuelConsumed: true,
            revenue: true,
        },
    });

    return new Map(trips.map((row) => [row.vehicleId, row._sum]));
}

async function getFuelCostByVehicle() {
    const rows = await prisma.fuelLog.groupBy({
        by: ['vehicleId'],
        _sum: { cost: true },
    });

    return new Map(rows.map((row) => [row.vehicleId, row._sum.cost ?? toDecimal(0)]));
}

async function getMaintenanceCostByVehicle() {
    const rows = await prisma.maintenanceLog.groupBy({
        by: ['vehicleId'],
        _sum: { cost: true },
    });

    return new Map(rows.map((row) => [row.vehicleId, row._sum.cost ?? toDecimal(0)]));
}

export async function getFuelEfficiency() {
    const vehicles = await prisma.vehicle.findMany({
        select: {
            id: true,
            registrationNumber: true,
            name: true,
        },
    });

    const tripAggregates = await getCompletedTripAggregatesByVehicle();

    const results = vehicles.map((vehicle) => {
        const agg = tripAggregates.get(vehicle.id);
        const totalDistance = agg?.actualDistance ?? toDecimal(0);
        const totalFuel = agg?.fuelConsumed ?? toDecimal(0);
        const efficiency = divideDecimals(totalDistance, totalFuel);

        return {
            vehicleId: vehicle.id,
            registrationNumber: vehicle.registrationNumber,
            name: vehicle.name,
            totalDistance: decimalToNumber(totalDistance),
            totalFuel: decimalToNumber(totalFuel),
            fuelEfficiencyKmPerLiter: efficiency ? decimalToNumber(efficiency) : null,
        };
    });

    return results;
}

export async function getFleetUtilization() {
    const [onTripCount, nonRetiredCount] = await Promise.all([
        prisma.vehicle.count({ where: { status: 'OnTrip' } }),
        prisma.vehicle.count({ where: { status: { not: 'Retired' } } }),
    ]);

    const utilization = nonRetiredCount === 0 ? 0 : (onTripCount / nonRetiredCount) * 100;

    return {
        vehiclesOnTrip: onTripCount,
        totalNonRetiredVehicles: nonRetiredCount,
        fleetUtilizationPercent: Number(utilization.toFixed(2)),
    };
}

export async function getOperationalCost() {
    const vehicles = await prisma.vehicle.findMany({
        select: {
            id: true,
            registrationNumber: true,
            name: true,
        },
    });

    const [fuelCosts, maintenanceCosts] = await Promise.all([
        getFuelCostByVehicle(),
        getMaintenanceCostByVehicle(),
    ]);

    const results = vehicles.map((vehicle) => {
        const fuelCost = fuelCosts.get(vehicle.id) ?? toDecimal(0);
        const maintenanceCost = maintenanceCosts.get(vehicle.id) ?? toDecimal(0);
        const totalCost = sumDecimals([fuelCost, maintenanceCost]);

        return {
            vehicleId: vehicle.id,
            registrationNumber: vehicle.registrationNumber,
            name: vehicle.name,
            fuelCost: decimalToNumber(fuelCost),
            maintenanceCost: decimalToNumber(maintenanceCost),
            totalOperationalCost: decimalToNumber(totalCost),
        };
    });

    return results;
}

export async function getVehicleRoi() {
    const vehicles = await prisma.vehicle.findMany({
        select: {
            id: true,
            registrationNumber: true,
            name: true,
            acquisitionCost: true,
        },
    });

    const [tripAggregates, fuelCosts, maintenanceCosts] = await Promise.all([
        getCompletedTripAggregatesByVehicle(),
        getFuelCostByVehicle(),
        getMaintenanceCostByVehicle(),
    ]);

    const results = vehicles.map((vehicle) => {
        const tripAgg = tripAggregates.get(vehicle.id);
        const revenue = tripAgg?.revenue ?? toDecimal(0);
        const fuelCost = fuelCosts.get(vehicle.id) ?? toDecimal(0);
        const maintenanceCost = maintenanceCosts.get(vehicle.id) ?? toDecimal(0);
        const totalCost = sumDecimals([fuelCost, maintenanceCost]);
        const netProfit = toDecimal(revenue).minus(totalCost);
        const roi = divideDecimals(netProfit, vehicle.acquisitionCost);

        return {
            vehicleId: vehicle.id,
            registrationNumber: vehicle.registrationNumber,
            name: vehicle.name,
            acquisitionCost: decimalToNumber(vehicle.acquisitionCost),
            totalRevenue: decimalToNumber(revenue),
            fuelCost: decimalToNumber(fuelCost),
            maintenanceCost: decimalToNumber(maintenanceCost),
            netProfit: decimalToNumber(netProfit),
            roi: roi ? decimalToNumber(roi) : null,
        };
    });

    return results;
}

const REPORT_BUILDERS = {
    'fuel-efficiency': {
        fetch: getFuelEfficiency,
        filename: 'fuel-efficiency-report.csv',
        columns: [
            { header: 'Vehicle ID', key: 'vehicleId' },
            { header: 'Registration Number', key: 'registrationNumber' },
            { header: 'Name', key: 'name' },
            { header: 'Total Distance (km)', key: 'totalDistance' },
            { header: 'Total Fuel (L)', key: 'totalFuel' },
            { header: 'Fuel Efficiency (km/L)', key: 'fuelEfficiencyKmPerLiter' },
        ],
    },
    utilization: {
        fetch: getFleetUtilization,
        filename: 'fleet-utilization-report.csv',
        columns: [
            { header: 'Vehicles On Trip', accessor: (row) => row.vehiclesOnTrip },
            { header: 'Total Non-Retired Vehicles', accessor: (row) => row.totalNonRetiredVehicles },
            { header: 'Fleet Utilization (%)', accessor: (row) => row.fleetUtilizationPercent },
        ],
        wrapAsArray: true,
    },
    'operational-cost': {
        fetch: getOperationalCost,
        filename: 'operational-cost-report.csv',
        columns: [
            { header: 'Vehicle ID', key: 'vehicleId' },
            { header: 'Registration Number', key: 'registrationNumber' },
            { header: 'Name', key: 'name' },
            { header: 'Fuel Cost', key: 'fuelCost' },
            { header: 'Maintenance Cost', key: 'maintenanceCost' },
            { header: 'Total Operational Cost', key: 'totalOperationalCost' },
        ],
    },
    roi: {
        fetch: getVehicleRoi,
        filename: 'vehicle-roi-report.csv',
        columns: [
            { header: 'Vehicle ID', key: 'vehicleId' },
            { header: 'Registration Number', key: 'registrationNumber' },
            { header: 'Name', key: 'name' },
            { header: 'Acquisition Cost', key: 'acquisitionCost' },
            { header: 'Total Revenue', key: 'totalRevenue' },
            { header: 'Fuel Cost', key: 'fuelCost' },
            { header: 'Maintenance Cost', key: 'maintenanceCost' },
            { header: 'Net Profit', key: 'netProfit' },
            { header: 'ROI', key: 'roi' },
        ],
    },
};

export async function exportCsvReport(reportType) {
    const config = REPORT_BUILDERS[reportType];

    if (!config) {
        throw new AppError('Invalid report type', 400);
    }

    const data = await config.fetch();
    const rows = config.wrapAsArray ? [data] : data;
    const csv = buildCsv(rows, config.columns);

    return {
        filename: config.filename,
        csv,
    };
}
