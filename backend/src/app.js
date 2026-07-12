import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './middlewares/rateLimiter.middleware.js';
import routes from './routes/index.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(generalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Server is healthy' });
});

app.use('/api/v1', routes);

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
    });
});

export default app;