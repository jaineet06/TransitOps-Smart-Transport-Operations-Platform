import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.util.js';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123!';

const users = [
    {
        email: 'fleetmanager@transitops.com',
        name: 'Fleet Manager',
        role: 'FleetManager',
    },
    {
        email: 'dispatcher@transitops.com',
        name: 'Dispatcher',
        role: 'Dispatcher',
    },
    {
        email: 'safetyofficer@transitops.com',
        name: 'Safety Officer',
        role: 'SafetyOfficer',
    },
    {
        email: 'financialanalyst@transitops.com',
        name: 'Financial Analyst',
        role: 'FinancialAnalyst',
    },
];

const vehicleTemplates = [
    { name: 'Tata Prima 4928.S', model: '4928.S', type: 'Heavy Duty Truck', capacity: 40.0 },
    { name: 'BharatBenz 5528T', model: '5528T', type: 'Semi-Trailer', capacity: 35.0 },
    { name: 'Eicher Pro 6055', model: '6055', type: 'Heavy Duty Truck', capacity: 38.0 },
    { name: 'Volvo FMX 460', model: 'FMX 460', type: 'Heavy Duty Truck', capacity: 42.0 },
    { name: 'Ashok Leyland Boss 1215', model: 'Boss 1215', type: 'Medium Duty Truck', capacity: 12.0 },
    { name: 'Tata Ultra T.16', model: 'Ultra T.16', type: 'Medium Duty Truck', capacity: 16.0 },
    { name: 'Mahindra Furio 14', model: 'Furio 14', type: 'Medium Cargo Truck', capacity: 14.0 },
    { name: 'Eicher Pro 3019', model: '3019', type: 'Medium Duty Truck', capacity: 18.0 },
    { name: 'Tata Signa 2821.T', model: '2821.T', type: 'Container Carrier', capacity: 28.0 },
    { name: 'BharatBenz 2823R', model: '2823R', type: 'Container Carrier', capacity: 28.0 },
    { name: 'Ashok Leyland 3520', model: '3520', type: 'Container Carrier', capacity: 35.0 },
    { name: 'Eicher Pro 8028', model: '8028', type: 'Container Carrier', capacity: 28.0 },
    { name: 'Tata LPT 1918', model: 'LPT 1918', type: 'Tanker', capacity: 20.0 },
    { name: 'Ashok Leyland 1920', model: '1920', type: 'Tanker', capacity: 20.0 },
    { name: 'BharatBenz 1917', model: '1917', type: 'Tanker', capacity: 19.0 },
    { name: 'Eicher Pro 6019', model: '6019', type: 'Tanker', capacity: 19.0 },
    { name: 'Mahindra Supro Van', model: 'Supro', type: 'Delivery Van', capacity: 2.0 },
    { name: 'Tata Ace Gold', model: 'Ace Gold', type: 'Delivery Van', capacity: 1.5 },
];

const sourceDestinationPairs = [
    { source: 'Mumbai', destination: 'Pune', distance: 150 },
    { source: 'Delhi', destination: 'Jaipur', distance: 270 },
    { source: 'Bangalore', destination: 'Chennai', distance: 350 },
    { source: 'Hyderabad', destination: 'Vijayawada', distance: 280 },
    { source: 'Kolkata', destination: 'Bhubaneswar', distance: 440 },
    { source: 'Ahmedabad', destination: 'Surat', distance: 260 },
    { source: 'Chennai', destination: 'Madurai', distance: 460 },
    { source: 'Pune', destination: 'Nagpur', distance: 710 },
    { source: 'Delhi', destination: 'Chandigarh', distance: 240 },
    { source: 'Lucknow', destination: 'Kanpur', distance: 80 },
];

async function main() {
    console.log('Cleaning existing data...');
    await prisma.fuelLog.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.maintenanceLog.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.driver.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('Seeding users...');
    const passwordHash = await hashPassword(SEED_PASSWORD);
    for (const u of users) {
        await prisma.user.create({
            data: {
                email: u.email,
                name: u.name,
                role: u.role,
                passwordHash,
            },
        });
    }

    console.log('Seeding vehicles...');
    const createdVehicles = [];
    // We want to seed exactly 18 vehicles matching our status distribution:
    // 4 OnTrip, 3 InShop, 1 Retired, 10 Available
    const statuses = [
        'OnTrip', 'OnTrip', 'OnTrip', 'OnTrip',
        'InShop', 'InShop', 'InShop',
        'Retired',
        'Available', 'Available', 'Available', 'Available', 'Available',
        'Available', 'Available', 'Available', 'Available', 'Available'
    ];

    for (let i = 0; i < vehicleTemplates.length; i++) {
        const template = vehicleTemplates[i];
        const status = statuses[i];
        const stateCode = faker.helpers.arrayElement(['MH', 'DL', 'KA', 'TS', 'GJ', 'TN']);
        const regNum = `${stateCode}${faker.string.numeric(2)}${faker.string.alpha({ length: 2, casing: 'upper' })}${faker.string.numeric(4)}`;

        const v = await prisma.vehicle.create({
            data: {
                registrationNumber: regNum,
                name: template.name,
                model: template.model,
                type: template.type,
                maxLoadCapacity: template.capacity,
                odometer: faker.number.int({ min: 12000, max: 180000 }),
                acquisitionCost: faker.number.int({ min: 1500000, max: 6500000 }),
                status: status,
            },
        });
        createdVehicles.push(v);
    }

    console.log('Seeding drivers...');
    const createdDrivers = [];
    const soonExpiringDate = new Date();
    soonExpiringDate.setDate(soonExpiringDate.getDate() + faker.number.int({ min: 5, max: 20 }));

    const normalExpiringDate = new Date();
    normalExpiringDate.setFullYear(normalExpiringDate.getFullYear() + faker.number.int({ min: 1, max: 3 }));

    const driverStatuses = [
        'OnTrip', 'OnTrip', 'OnTrip', 'OnTrip',
        'Suspended',
        'OffDuty', 'OffDuty', 'OffDuty',
        'Available', 'Available', 'Available', 'Available', 'Available',
        'Available', 'Available', 'Available', 'Available', 'Available'
    ];

    const licenseCategories = ['Heavy Vehicle', 'Medium Vehicle', 'Light Vehicle', 'Hazardous Goods'];

    for (let i = 0; i < 18; i++) {
        const status = driverStatuses[i];
        const expiry = (i === 8 || i === 9) ? soonExpiringDate : normalExpiringDate;
        const licNum = `DL-${faker.string.numeric(13)}`;

        const d = await prisma.driver.create({
            data: {
                name: faker.person.fullName(),
                licenseNumber: licNum,
                licenseCategory: faker.helpers.arrayElement(licenseCategories),
                licenseExpiryDate: expiry,
                contactNumber: faker.phone.number({ style: 'international' }).slice(0, 15),
                safetyScore: faker.number.int({ min: 65, max: 100 }),
                status: status,
            },
        });
        createdDrivers.push(d);
    }

    console.log('Seeding trips (45 total with full coverage guaranteed)...');
    
    // Group vehicles and drivers
    const vehiclesOnTrip = createdVehicles.filter(v => v.status === 'OnTrip');
    const driversOnTrip = createdDrivers.filter(d => d.status === 'OnTrip');
    const otherVehicles = createdVehicles.filter(v => v.status !== 'OnTrip'); // Retired, Available, InShop
    const otherDrivers = createdDrivers.filter(d => d.status !== 'OnTrip'); // Suspended, OffDuty, Available

    // STEP A: Guarantee every vehicle has at least 1 completed trip
    // (So fuel efficiency, operational costs, and ROI are non-zero for all vehicles)
    for (let i = 0; i < createdVehicles.length; i++) {
        const vehicle = createdVehicles[i];
        // Match with a driver. We can loop through createdDrivers.
        const driver = createdDrivers[i % createdDrivers.length];
        const route = faker.helpers.arrayElement(sourceDestinationPairs);
        const cargoWeight = faker.number.float({ min: 1, max: Number(vehicle.maxLoadCapacity), multipleOf: 0.1 });

        const daysAgo = faker.number.int({ min: 10, max: 30 });
        const draftedAt = new Date();
        draftedAt.setDate(draftedAt.getDate() - daysAgo);
        draftedAt.setHours(faker.number.int({ min: 6, max: 12 }));

        const dispatchedAt = new Date(draftedAt.getTime() + 3600000 * 2);
        const completedAt = new Date(dispatchedAt.getTime() + 3600000 * faker.number.int({ min: 8, max: 24 }));

        const distance = route.distance;
        const actualDistance = distance + faker.number.int({ min: -10, max: 20 });
        const efficiency = faker.number.float({ min: 4, max: 8, multipleOf: 0.1 });
        const fuelConsumed = actualDistance / efficiency;
        const revenue = distance * cargoWeight * faker.number.float({ min: 10, max: 25, multipleOf: 0.5 });

        await prisma.trip.create({
            data: {
                source: route.source,
                destination: route.destination,
                vehicleId: vehicle.id,
                driverId: driver.id,
                cargoWeight: cargoWeight,
                plannedDistance: distance,
                actualDistance: actualDistance,
                fuelConsumed: fuelConsumed,
                revenue: revenue,
                status: 'Completed',
                draftedAt,
                dispatchedAt,
                completedAt,
            },
        });
    }

    // STEP B: Seed 4 Dispatched trips matching the OnTrip vehicle/driver statuses
    for (let i = 0; i < 4; i++) {
        const vehicle = vehiclesOnTrip[i];
        const driver = driversOnTrip[i];
        const route = faker.helpers.arrayElement(sourceDestinationPairs);

        await prisma.trip.create({
            data: {
                source: route.source,
                destination: route.destination,
                vehicleId: vehicle.id,
                driverId: driver.id,
                cargoWeight: faker.number.float({ min: 1, max: Number(vehicle.maxLoadCapacity), multipleOf: 0.1 }),
                plannedDistance: route.distance,
                status: 'Dispatched',
                draftedAt: new Date(Date.now() - 3600000 * 5),
                dispatchedAt: new Date(Date.now() - 3600000 * 4),
                revenue: route.distance * 12.5,
            },
        });
    }

    // STEP C: Seed remaining Completed trips to reach 32 completed trips
    // 18 were created in STEP A. We need 14 more.
    for (let i = 0; i < 14; i++) {
        const vehicle = faker.helpers.arrayElement(createdVehicles);
        const driver = faker.helpers.arrayElement(createdDrivers);
        const route = faker.helpers.arrayElement(sourceDestinationPairs);
        const cargoWeight = faker.number.float({ min: 1, max: Number(vehicle.maxLoadCapacity), multipleOf: 0.1 });

        const daysAgo = faker.number.int({ min: 2, max: 9 });
        const draftedAt = new Date();
        draftedAt.setDate(draftedAt.getDate() - daysAgo);

        const dispatchedAt = new Date(draftedAt.getTime() + 3600000 * 2);
        const completedAt = new Date(dispatchedAt.getTime() + 3600000 * faker.number.int({ min: 8, max: 24 }));

        const distance = route.distance;
        const actualDistance = distance + faker.number.int({ min: -5, max: 15 });
        const efficiency = faker.number.float({ min: 4.5, max: 7.5, multipleOf: 0.1 });
        const fuelConsumed = actualDistance / efficiency;
        const revenue = distance * cargoWeight * faker.number.float({ min: 12, max: 22, multipleOf: 0.5 });

        await prisma.trip.create({
            data: {
                source: route.source,
                destination: route.destination,
                vehicleId: vehicle.id,
                driverId: driver.id,
                cargoWeight: cargoWeight,
                plannedDistance: distance,
                actualDistance: actualDistance,
                fuelConsumed: fuelConsumed,
                revenue: revenue,
                status: 'Completed',
                draftedAt,
                dispatchedAt,
                completedAt,
            },
        });
    }

    // STEP D: Seed 4 Cancelled trips
    for (let i = 0; i < 4; i++) {
        const vehicle = faker.helpers.arrayElement(createdVehicles.filter(v => v.status !== 'Retired'));
        const driver = faker.helpers.arrayElement(createdDrivers.filter(d => d.status !== 'Suspended'));
        const route = faker.helpers.arrayElement(sourceDestinationPairs);

        const daysAgo = faker.number.int({ min: 5, max: 28 });
        const draftedAt = new Date();
        draftedAt.setDate(draftedAt.getDate() - daysAgo);

        await prisma.trip.create({
            data: {
                source: route.source,
                destination: route.destination,
                vehicleId: vehicle.id,
                driverId: driver.id,
                cargoWeight: faker.number.float({ min: 1, max: Number(vehicle.maxLoadCapacity), multipleOf: 0.1 }),
                plannedDistance: route.distance,
                status: 'Cancelled',
                draftedAt,
                cancelledAt: new Date(draftedAt.getTime() + 3600000 * 4),
            },
        });
    }

    // STEP E: Seed 5 Draft trips
    for (let i = 0; i < 5; i++) {
        const vehicle = faker.helpers.arrayElement(createdVehicles.filter(v => v.status === 'Available'));
        const driver = faker.helpers.arrayElement(createdDrivers.filter(d => d.status === 'Available'));
        const route = faker.helpers.arrayElement(sourceDestinationPairs);

        await prisma.trip.create({
            data: {
                source: route.source,
                destination: route.destination,
                vehicleId: vehicle.id,
                driverId: driver.id,
                cargoWeight: faker.number.float({ min: 1, max: Number(vehicle.maxLoadCapacity), multipleOf: 0.1 }),
                plannedDistance: route.distance,
                status: 'Draft',
                draftedAt: new Date(),
            },
        });
    }

    console.log('Seeding maintenance logs (16 total, guarantee all vehicles have logs)...');
    
    // 3 Active logs for InShop vehicles
    const vehiclesInShop = createdVehicles.filter(v => v.status === 'InShop');
    for (let i = 0; i < 3; i++) {
        const vehicle = vehiclesInShop[i];
        await prisma.maintenanceLog.create({
            data: {
                vehicleId: vehicle.id,
                description: faker.helpers.arrayElement([
                    'Routine engine tuning and oil change',
                    'Brake drum replacement & pad renewal',
                    'Suspension overhaul & alignment check'
                ]),
                cost: faker.number.int({ min: 3000, max: 22000 }),
                status: 'Active',
                startDate: new Date(Date.now() - 3600000 * 24 * faker.number.int({ min: 1, max: 4 })),
            },
        });
    }

    // 13 Closed logs for the other 15 vehicles (guarantees coverage)
    const otherVehiclesForMaintenance = createdVehicles.filter(v => v.status !== 'InShop');
    for (let i = 0; i < 13; i++) {
        const vehicle = otherVehiclesForMaintenance[i % otherVehiclesForMaintenance.length];
        const daysAgo = faker.number.int({ min: 5, max: 30 });
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        const duration = faker.number.int({ min: 1, max: 5 });
        const endDate = new Date(startDate.getTime() + 3600000 * 24 * duration);

        await prisma.maintenanceLog.create({
            data: {
                vehicleId: vehicle.id,
                description: faker.helpers.arrayElement([
                    'Windshield replacement',
                    'Gearbox synchronization repair',
                    'Coolant leak fix & radiator flush',
                    'Tyre rotation and replacement of 2 front tyres',
                    'Electrical wiring check & headlamp replacement',
                    'Battery diagnostic and replacement',
                    'Fuel filter replacement'
                ]),
                cost: faker.number.int({ min: 1500, max: 55000 }),
                status: 'Closed',
                startDate,
                endDate,
            },
        });
    }

    console.log('Seeding fuel logs (28 total, guarantee all non-retired vehicles have logs)...');
    const nonRetiredVehicles = createdVehicles.filter(v => v.status !== 'Retired');
    
    // First, make sure every non-retired vehicle has at least 1 fuel log
    for (let i = 0; i < nonRetiredVehicles.length; i++) {
        const vehicle = nonRetiredVehicles[i];
        const liters = faker.number.float({ min: 40, max: 200, multipleOf: 0.1 });
        const costPerLiter = faker.number.float({ min: 88, max: 97, multipleOf: 0.01 });

        const daysAgo = faker.number.int({ min: 1, max: 30 });
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        await prisma.fuelLog.create({
            data: {
                vehicleId: vehicle.id,
                liters,
                cost: liters * costPerLiter,
                date,
            },
        });
    }

    // Add remaining 10 fuel logs randomly
    for (let i = 0; i < 10; i++) {
        const vehicle = faker.helpers.arrayElement(nonRetiredVehicles);
        const liters = faker.number.float({ min: 60, max: 250, multipleOf: 0.1 });
        const costPerLiter = faker.number.float({ min: 88, max: 97, multipleOf: 0.01 });

        const daysAgo = faker.number.int({ min: 1, max: 29 });
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        await prisma.fuelLog.create({
            data: {
                vehicleId: vehicle.id,
                liters,
                cost: liters * costPerLiter,
                date,
            },
        });
    }

    console.log('Seeding expenses (28 total, guarantee all non-retired vehicles have expenses)...');
    
    // First, make sure every non-retired vehicle has at least 1 expense
    for (let i = 0; i < nonRetiredVehicles.length; i++) {
        const vehicle = nonRetiredVehicles[i];
        const type = faker.helpers.arrayElement(['Toll', 'Other']);
        const amount = type === 'Toll'
            ? faker.number.int({ min: 150, max: 800 })
            : faker.number.int({ min: 200, max: 2500 });

        const daysAgo = faker.number.int({ min: 1, max: 30 });
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        await prisma.expense.create({
            data: {
                vehicleId: vehicle.id,
                type,
                amount,
                date,
            },
        });
    }

    // Add remaining 10 expenses randomly
    for (let i = 0; i < 10; i++) {
        const vehicle = faker.helpers.arrayElement(nonRetiredVehicles);
        const type = faker.helpers.arrayElement(['Toll', 'Other']);
        const amount = type === 'Toll'
            ? faker.number.int({ min: 100, max: 1200 })
            : faker.number.int({ min: 250, max: 3500 });

        const daysAgo = faker.number.int({ min: 1, max: 29 });
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        await prisma.expense.create({
            data: {
                vehicleId: vehicle.id,
                type,
                amount,
                date,
            },
        });
    }

    console.log('Seeding completed successfully with full coverage!');
    console.log(`Default password for all seeded users: ${SEED_PASSWORD}`);
}

main()
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
