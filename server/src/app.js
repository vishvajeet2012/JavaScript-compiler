const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config');
const requestLogger = require('./middleware/logger');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const ApiError = require('./utils/ApiError');

/**
 * Express application setup
 * Configures middleware chain and routes
 */
const app = express();

// Vercel / reverse-proxy: correct client IP for rate limiting
app.set('trust proxy', 1);

// --------------- Security Middleware ---------------
// Helmet: sets various HTTP headers for security
app.use(helmet());

// CORS: Next.js (jsplay-kappa) + admin (Vite) + local
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  })
);

// Rate limiting: protect against brute-force / DDoS
app.use(rateLimiter);

// --------------- Parsing Middleware ---------------
// Parse JSON bodies (limit to 16kb to prevent large payload attacks)
app.use(express.json({ limit: '16kb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// --------------- Performance Middleware ---------------
// Compress all responses
app.use(compression());

// --------------- Logging ---------------
app.use(requestLogger);

// --------------- Routes ---------------
app.use(routes);

// --------------- 404 Handler ---------------
// Catch any routes that don't match
app.use((req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
});

// --------------- Global Error Handler ---------------
// Must be last middleware
app.use(errorHandler);

module.exports = app;
