import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
});

/**
 * Sends an email using the configured SMTP transport.
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Subject line
 * @param {string} [options.html] - HTML body
 * @param {string} [options.text] - Plain text body
 */
export async function sendEmail({ to, subject, html, text }) {
    const from = process.env.SMTP_FROM || 'no-reply@transitops.com';
    return transporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
    });
}
