import * as notificationService from '../services/notification.service.js';
import { sendEmail } from '../utils/mailer.js';

/**
 * GET handler to retrieve alerts list and counts.
 */
export async function getNotifications(req, res, next) {
    try {
        const notifications = await notificationService.getNotifications();
        res.status(200).json({
            success: true,
            data: notifications,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST handler to compile and manually send license alerts summary to the logged-in Safety Officer.
 */
export async function sendLicenseReminders(req, res, next) {
    try {
        const licenseAlerts = await notificationService.getLicenseAlerts();

        if (licenseAlerts.length === 0) {
            return res.status(200).json({
                success: true,
                sent: 0,
                failed: 0,
                message: 'No expiring or expired licenses found. No email sent.',
            });
        }

        const { driverId } = req.body || {};
        let alertsToSend = licenseAlerts;

        if (driverId) {
            alertsToSend = licenseAlerts.filter((a) => a.driverId === driverId);
            if (alertsToSend.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'No active license alert found for this driver.',
                });
            }
        }

        let sent = 0;
        let failed = 0;

        for (const alert of alertsToSend) {
            try {
                const formattedDate = new Date(alert.licenseExpiryDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                });

                let emailHtml;
                let emailText;

                if (alert.severity === 'expired') {
                    emailHtml = `
                        <p>Hi ${alert.driverName},</p>
                        <p>Your license (${alert.licenseNumber}) has expired. Please renew promptly.</p>
                    `;
                    emailText = `Hi ${alert.driverName},\n\nYour license (${alert.licenseNumber}) has expired. Please renew promptly.`;
                } else {
                    emailHtml = `
                        <p>Hi ${alert.driverName},</p>
                        <p>Your license (${alert.licenseNumber}) expires on ${formattedDate} (${alert.daysRemaining} days remaining). Please renew promptly.</p>
                    `;
                    emailText = `Hi ${alert.driverName},\n\nYour license (${alert.licenseNumber}) expires on ${formattedDate} (${alert.daysRemaining} days remaining). Please renew promptly.`;
                }

                await sendEmail({
                    to: alert.driverEmail,
                    subject: alert.severity === 'expired' ? '[TransitOps] Urgent: License Expired' : '[TransitOps] License Expiry Warning',
                    html: emailHtml,
                    text: emailText,
                });
                sent++;
            } catch (err) {
                console.error(`Failed to send email to driver ${alert.driverName} (${alert.driverEmail}):`, err);
                failed++;
            }
        }

        res.status(200).json({
            success: true,
            sent,
            failed,
            message: `Compliance email reminders processed: ${sent} sent, ${failed} failed.`,
        });
    } catch (err) {
        next(err);
    }
}
