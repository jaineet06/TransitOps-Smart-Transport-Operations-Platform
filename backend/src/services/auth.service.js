import prisma from '../configs/db.js';
import { AppError } from '../utils/AppError.js';
import { comparePassword } from '../utils/password.util.js';
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    hashToken,
    compareToken,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_MAX_AGE_MS,
} from '../utils/token.util.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function buildTokenPayload(user) {
    return {
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
    };
}

function sanitizeUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    };
}

function setRefreshTokenCookie(res, refreshToken) {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
        path: '/api/v1/auth',
    });
}

function clearRefreshTokenCookie(res) {
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
    });
}

async function registerFailedLogin(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        return;
    }

    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const shouldLock = failedLoginAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
        where: { id: userId },
        data: {
            failedLoginAttempts,
            lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : user.lockedUntil,
        },
    });
}

async function resetLoginAttempts(userId) {
    await prisma.user.update({
        where: { id: userId },
        data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
        },
    });
}

export async function login({ email, password }, res) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new AppError('Invalid email or password', 401);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new AppError('Account is temporarily locked due to too many failed login attempts', 423);
    }

    if (user.lockedUntil && user.lockedUntil <= new Date()) {
        await resetLoginAttempts(user.id);
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
        await registerFailedLogin(user.id);
        throw new AppError('Invalid email or password', 401);
    }

    const tokenPayload = buildTokenPayload(user);
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ sub: user.id });
    const refreshTokenHash = await hashToken(refreshToken);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            refreshTokenHash,
            failedLoginAttempts: 0,
            lockedUntil: null,
        },
    });

    setRefreshTokenCookie(res, refreshToken);

    return {
        accessToken,
        refreshToken,
        user: sanitizeUser(user),
    };
}

export async function refresh(refreshTokenInput, res) {
    if (!refreshTokenInput) {
        throw new AppError('Refresh token is required', 401);
    }

    let decoded;

    try {
        decoded = verifyRefreshToken(refreshTokenInput);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new AppError('Refresh token expired', 401);
        }
        throw new AppError('Invalid refresh token', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

    if (!user || !user.refreshTokenHash) {
        throw new AppError('Invalid refresh token', 401);
    }

    const isRefreshTokenValid = await compareToken(refreshTokenInput, user.refreshTokenHash);

    if (!isRefreshTokenValid) {
        throw new AppError('Invalid refresh token', 401);
    }

    const tokenPayload = buildTokenPayload(user);
    const accessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken({ sub: user.id });
    const refreshTokenHash = await hashToken(newRefreshToken);

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash },
    });

    setRefreshTokenCookie(res, newRefreshToken);

    return {
        accessToken,
        refreshToken: newRefreshToken,
        user: sanitizeUser(user),
    };
}

export async function logout(userId, res) {
    await prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
    });

    clearRefreshTokenCookie(res);
}

export { clearRefreshTokenCookie, REFRESH_TOKEN_COOKIE_NAME };
