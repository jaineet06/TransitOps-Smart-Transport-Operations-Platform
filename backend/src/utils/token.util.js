import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 12;

function getAccessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    return secret;
}

function getRefreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    return secret;
}

export function signAccessToken(payload) {
    return jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(payload) {
    return jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token) {
    return jwt.verify(token, getAccessSecret());
}

export function verifyRefreshToken(token) {
    return jwt.verify(token, getRefreshSecret());
}

export async function hashToken(token) {
    return bcrypt.hash(token, BCRYPT_ROUNDS);
}

export async function compareToken(token, hash) {
    if (!hash) {
        return false;
    }
    return bcrypt.compare(token, hash);
}

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
