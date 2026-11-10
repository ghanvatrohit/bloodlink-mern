import { logger } from '../utils/logger.js';
export const notFound = (req, res) => res.status(404).json({ message: `Route ${req.originalUrl} not found` });
export const errorHandler = (err, req, res, _next) => {
  const status = err.status || (err.code === 11000 ? 409 : 500);
  if (status >= 500) logger.error(err.stack);
  res.status(status).json({ message: err.code === 11000 ? 'Duplicate entry' : err.message || 'Server error' });
};
