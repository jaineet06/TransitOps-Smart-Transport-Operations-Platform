import { Decimal } from '@prisma/client/runtime/library';

export function toDecimal(value) {
    if (value instanceof Decimal) {
        return value;
    }
    return new Decimal(value);
}

export function decimalToNumber(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (value instanceof Decimal) {
        return value.toNumber();
    }
    return Number(value);
}

export function serializeDecimals(value) {
    if (value instanceof Decimal) {
        return value.toNumber();
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        return value.map(serializeDecimals);
    }

    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, val]) => [key, serializeDecimals(val)])
        );
    }

    return value;
}

export function sumDecimals(values) {
    return values.reduce((acc, val) => acc.plus(toDecimal(val ?? 0)), new Decimal(0));
}

export function divideDecimals(numerator, denominator) {
    const denom = toDecimal(denominator);
    if (denom.isZero()) {
        return null;
    }
    return toDecimal(numerator).dividedBy(denom);
}
