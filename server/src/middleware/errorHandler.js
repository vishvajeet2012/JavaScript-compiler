const ApiError = require('../utils/ApiError');
const config = require('../config');

/**
 * Global error handling middleware
 * Must be registered LAST in the middleware chain (4 arguments required)
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of ApiError, wrap it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors,
    // Include stack trace only in development
    ...(config.isDevelopment && { stack: error.stack }),
  };

  // Log the error
  console.error(`[ERROR] ${error.statusCode} - ${error.message}`);
  if (config.isDevelopment) {
    console.error(error.stack);
  }

  return res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
