import { clsx } from 'clsx';

/** Tailwind class merger */
export function cn(...inputs) {
  return clsx(inputs);
}

/** Format ISO date string to locale date */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Format a number as Indian Rupee currency */
export function formatCurrency(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

/** Format plain number with locale separators */
export function formatNumber(value, decimals = 2) {
  if (value == null) return '—';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/** Days until a future date (negative = already expired) */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Extract a user-facing error message from an axios error */
export function extractError(err, fallback = 'An unexpected error occurred') {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.message) return err.message;
  return fallback;
}

/**
 * Convert a Zod safeParse error to a { field: message } flat map.
 * Zod v4 uses .issues; Zod v3 uses .errors — handle both.
 */
export function zodErrorMap(zodError) {
  const map = {};
  if (!zodError) return map;
  // Zod v4: .issues  |  Zod v3: .errors  |  fallback: empty array
  const issues = zodError.issues ?? zodError.errors ?? [];
  for (const issue of issues) {
    const key = issue.path.join('.');
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}

/** Debounce helper */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Safe division to prevent division-by-zero or NaN */
export function safeDivide(numerator, denominator, fallback = '—') {
  const num = Number(numerator);
  const denom = Number(denominator);
  if (isNaN(num) || isNaN(denom) || denom === 0) {
    return fallback;
  }
  return num / denom;
}

