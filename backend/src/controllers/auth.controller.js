import * as authService from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import { REFRESH_TOKEN_COOKIE_NAME } from '../utils/token.util.js';

export async function login(req, res, next) {
    try {
        const result = await authService.login(req.validated, res);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
}

export async function refresh(req, res, next) {
    try {
        const refreshToken = req.validated?.refreshToken || req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

        const result = await authService.refresh(refreshToken, res);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
}

export async function logout(req, res, next) {
    try {
        if (!req.user?.id) {
            throw new AppError('Authentication required', 401);
        }

        await authService.logout(req.user.id, res);

        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (err) {
        next(err);
    }
}

export async function me(req, res, next) {
    try {
        res.status(200).json({
            success: true,
            data: { user: req.user },
        });
    } catch (err) {
        next(err);
    }
}
