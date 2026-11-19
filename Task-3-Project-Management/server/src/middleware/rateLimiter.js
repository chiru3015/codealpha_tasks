import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter: 200 requests per 15-minute window per IP.
 * Explicitly skips health checks so monitoring/orchestration probes are never throttled.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' },
  skip: (req) => {
    const pathname = (req.originalUrl || req.url || '').split('?')[0];
    return pathname === '/api/health' || pathname === '/health';
  },
});

/**
 * Strict login rate limiter: 10 attempts per 15-minute window per IP.
 * Protects against automated brute-force attacks and credential stuffing.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' },
});

/**
 * Strict registration rate limiter: 10 registrations per 1-hour window per IP.
 * Protects against account spamming and mass signups.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many accounts created from this IP, please try again later.' },
});
