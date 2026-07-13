const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiting middleware
 * Protects against brute-force and DDoS attacks
 */
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    data: null,
  },
});

module.exports = rateLimiter;
