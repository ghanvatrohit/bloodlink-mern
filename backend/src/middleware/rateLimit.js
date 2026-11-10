import rateLimit from 'express-rate-limit';
export const apiLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 500, standardHeaders: true, legacyHeaders: false });
export const authLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 20, message: { message: 'Too many attempts, try later' } });
