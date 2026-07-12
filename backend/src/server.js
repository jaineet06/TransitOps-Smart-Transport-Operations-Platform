import 'dotenv/config';
import app from './app.js';
import prisma from './configs/db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await prisma.$connect();
        console.log('Database connected');

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});