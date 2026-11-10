import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

// Verify JWT & extract role
export const protect = async (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(new AppError('Not authenticated', 401));
  try {
    const { id } = jwt.verify(token, env.accessSecret);
    const user = await User.findById(id);
    if (!user || user.isBlocked) return next(new AppError('Account unavailable', 401));
    req.user = user;
    next();
  } catch { next(new AppError('Token expired', 401)); }
};

// Restrict route to given roles
export const allow = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('Forbidden', 403));
