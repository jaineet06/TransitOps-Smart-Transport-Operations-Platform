import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './middlewares/rateLimiter.middleware';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(generalLimiter)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// health check
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Server is healthy' });
});

// routes will be mounted here once generated
// app.use('/api/v1', routes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

// centralized error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
    });
});

export default app;