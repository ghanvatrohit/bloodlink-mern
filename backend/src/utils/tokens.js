import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export const signAccess = (u) => jwt.sign({ id: u._id, role: u.role }, env.accessSecret, { expiresIn: env.accessExpires });
export const signRefresh = (u) => jwt.sign({ id: u._id, v: u.tokenVersion }, env.refreshSecret, { expiresIn: env.refreshExpires });
export const cookieOpts = { httpOnly: true, secure: env.isProd, sameSite: env.isProd ? 'none' : 'lax', path: '/api/auth', maxAge: 7 * 864e5 };
