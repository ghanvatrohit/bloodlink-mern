import 'dotenv/config';
export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((s) => s.trim()),
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  lowStock: Number(process.env.LOW_STOCK_THRESHOLD || 5),
  isProd: process.env.NODE_ENV === 'production',
};
