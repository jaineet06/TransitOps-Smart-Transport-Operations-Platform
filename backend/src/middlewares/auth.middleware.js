import { verifyAccessToken } from '../utils/token.util.js';
import { AppError } from '../utils/AppError.js';

export function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new AppError('Access token is required', 401);
        }

        const token = authHeader.slice(7);
        const decoded = verifyAccessToken(token);

        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new AppError('Access token expired', 401));
        }

        if (err.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid access token', 401));
        }

        next(err);
    }
}
