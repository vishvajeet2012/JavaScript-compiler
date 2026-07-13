const dotenv = require('dotenv');
const path = require('path');

// Local .env (ignored on Vercel; uses dashboard env vars)
try {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} catch {
  /* ignore */
}

const DEFAULT_CORS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Production Next.js frontend
  'https://jsplay-kappa.vercel.app',
].join(',');

/**
 * Application configuration
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isVercel: Boolean(process.env.VERCEL),

  // CORS — comma-separated list → array for cors package
  corsOrigin: (() => {
    const raw = process.env.CORS_ORIGIN || DEFAULT_CORS;
    const list = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length === 1 ? list[0] : list;
  })(),

  // Human-readable CORS for logs
  corsOriginLabel: (() => {
    const raw = process.env.CORS_ORIGIN || DEFAULT_CORS;
    return raw.length > 40 ? `${raw.slice(0, 37)}...` : raw;
  })(),

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  },

  db: {
    // Prefer MONGODB_URI env. Default uses standard host list (works when SRV/DNS is blocked).
    uri:
      process.env.MONGODB_URI ||
      'mongodb://vishvajeet4711_db_user:QHqqzNpZEywm7LU6@ac-atfr6au-shard-00-00.kqih8fi.mongodb.net:27017,ac-atfr6au-shard-00-01.kqih8fi.mongodb.net:27017,ac-atfr6au-shard-00-02.kqih8fi.mongodb.net:27017/js-compiler?ssl=true&replicaSet=atlas-zggmk3-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0',
  },

  adminSecret: process.env.ADMIN_SECRET || 'admin123',

  activationSecret:
    process.env.ACTIVATION_SECRET || 'js-compiler-secret-change-in-production',

  apiPrefix: '/api/v1',
};

module.exports = config;
