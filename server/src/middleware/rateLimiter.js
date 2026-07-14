const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiting middleware
 * Vercel: trust proxy is set on app; validate relaxed for serverless edge IPs
 */
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  // Serverless: each instance has own memory store (best-effort on free tier)
  validate: {
    xForwardedForHeader: false,
    default: true,
  },
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    data: null,
  },
});

module.exports = rateLimiter;
