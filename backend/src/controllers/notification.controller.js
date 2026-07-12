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
                message: 'No expiring or expired licenses found. No email sent.',
                count: 0,
            });
        }

        const recipientEmail = req.user.email;
        const officerName = req.user.name || 'Safety Officer';

        let html = `
            <h2>Driver License Expiry Compliance Summary</h2>
            <p>Hello ${officerName},</p>
            <p>This is a manual compliance reminder listing drivers with expired or expiring licenses (within 30 days):</p>
            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; border-color: #e2e8f0; font-family: sans-serif;">
                <thead>
                    <tr style="background-color: #f8fafc; text-align: left;">
                        <th>Driver Name</th>
                        <th>License Number</th>
                        <th>Expiry Date</th>
                        <th>Days Remaining</th>
                        <th>Severity</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let text = `Driver License Expiry Compliance Summary\n\nHello ${officerName},\n\nThis is a manual compliance reminder listing drivers with expired or expiring licenses (within 30 days):\n\n`;

        licenseAlerts.forEach((alert) => {
            const formattedDate = new Date(alert.licenseExpiryDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
            const severityColor = alert.severity === 'expired' ? '#E0504A' : '#EAA220';

            html += `
                <tr>
                    <td><strong>${alert.driverName}</strong></td>
                    <td style="font-family: monospace;">${alert.licenseNumber}</td>
                    <td>${formattedDate}</td>
                    <td>${alert.severity === 'expired' ? 'Expired' : `${alert.daysRemaining} days`}</td>
                    <td><span style="color: ${severityColor}; font-weight: bold; text-transform: uppercase;">${alert.severity}</span></td>
                </tr>
            `;

            text += `- Driver: ${alert.driverName}\n  License No: ${alert.licenseNumber}\n  Expiry Date: ${formattedDate}\n  Days Remaining: ${alert.severity === 'expired' ? 'Expired' : alert.daysRemaining}\n  Severity: ${alert.severity.toUpperCase()}\n\n`;
        });

        html += `
                </tbody>
            </table>
            <p style="margin-top: 20px; font-size: 12px; color: #7b8fad;">Generated manually by TransitOps Compliance Notification Panel.</p>
        `;

        await sendEmail({
            to: recipientEmail,
            subject: `[TransitOps] Compliance Alert: ${licenseAlerts.length} Driver Licenses Expired or Expiring Soon`,
            html,
            text,
        });

        res.status(200).json({
            success: true,
            message: `Summary email successfully sent to ${recipientEmail}`,
            count: licenseAlerts.length,
        });
    } catch (err) {
        next(err);
    }
}
