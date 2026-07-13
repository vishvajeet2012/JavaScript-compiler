const morgan = require('morgan');
const config = require('../config');

/**
 * Request logging middleware using morgan
 * - Development: 'dev' format (concise colored output)
 * - Production: 'combined' format (Apache combined log format)
 */
const requestLogger = morgan(config.isProduction ? 'combined' : 'dev');

module.exports = requestLogger;
