import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
fs.mkdirSync(env.uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: env.uploadDir,
  filename: (_, f, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(f.originalname)}`),
});
// Allow only PDF / images up to 5MB
export const upload = multer({
  storage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) => cb(null, /pdf|jpe?g|png/.test(f.mimetype)),
});
