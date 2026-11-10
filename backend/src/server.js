import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/index.js';
import { logger } from './utils/logger.js';

const server = http.createServer(app);
initSocket(server);

connectDB()
  .then(() => server.listen(env.port, () => logger.info(`API on :${env.port}`)))
  .catch((e) => { logger.error(e); process.exit(1); });

// Graceful shutdown
const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
