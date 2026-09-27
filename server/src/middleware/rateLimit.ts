import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for spin start requests (max 20 per minute per IP).
 */
export const spinStartLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many spin initialization requests. Please wait a minute and try again.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Rate limiter for executing spins (max 15 per minute per IP).
 */
export const spinExecutionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many spin attempts. Please slow down and try again shortly.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Rate limiter for admin login attempts (max 10 per 15 minutes per IP) to prevent brute-force.
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many admin login attempts. Account temporarily locked for 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});
