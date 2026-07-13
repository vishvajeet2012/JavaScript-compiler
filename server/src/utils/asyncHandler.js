/**
 * Async handler wrapper
 * Wraps async route handlers to automatically catch errors
 * and forward them to Express error-handling middleware
 *
 * @param {Function} fn - Async express route handler
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
