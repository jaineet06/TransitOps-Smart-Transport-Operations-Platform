import rateLimit from 'express-rate-limit';

// general limiter for all routes
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, // 100 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
});