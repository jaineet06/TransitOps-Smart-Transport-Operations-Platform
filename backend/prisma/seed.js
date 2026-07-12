import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.util.js';

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

async function main() {
    const passwordHash = await hashPassword(SEED_PASSWORD);

    for (const user of users) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: {
                name: user.name,
                role: user.role,
                passwordHash,
                failedLoginAttempts: 0,
                lockedUntil: null,
                refreshTokenHash: null,
            },
            create: {
                email: user.email,
                name: user.name,
                role: user.role,
                passwordHash,
            },
        });

        console.log(`Seeded user: ${user.email} (${user.role})`);
    }

    console.log(`\nDefault password for all seeded users: ${SEED_PASSWORD}`);
}

main()
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
