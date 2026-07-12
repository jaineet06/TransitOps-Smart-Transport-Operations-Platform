import 'dotenv/config';
import * as notificationService from './services/notification.service.js';
import prisma from './configs/db.js';

async function run() {
    try {
        console.log('Connecting to database...');
        await prisma.$connect();
        console.log('Connected! Fetching notifications...');
        
        const notifications = await notificationService.getNotifications();
        console.log('SUCCESS! Notifications computed:');
        console.log(JSON.stringify(notifications, null, 2));

        const licenseAlerts = await notificationService.getLicenseAlerts();
        console.log(`Found ${licenseAlerts.length} license expiry alerts.`);

        const maintenanceAlerts = await notificationService.getMaintenanceAlerts();
        console.log(`Found ${maintenanceAlerts.length} maintenance alerts.`);

    } catch (err) {
        console.error('Error during test:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
