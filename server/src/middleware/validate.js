const ApiError = require('../utils/ApiError');

/**
 * Request validation middleware factory
 * Validates that required fields exist in the request body
 *
 * @param {string[]} requiredFields - Array of required field names
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.post('/contact', validate(['name', 'email', 'message']), controller.contact);
 */
const validate = (requiredFields = []) => {
  return (req, res, next) => {
    const missingFields = [];

    for (const field of requiredFields) {
      if (
        req.body[field] === undefined ||
        req.body[field] === null ||
        (typeof req.body[field] === 'string' && req.body[field].trim() === '')
      ) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw ApiError.badRequest(
        `Missing required fields: ${missingFields.join(', ')}`,
        missingFields.map((field) => ({
          field,
          message: `${field} is required`,
        }))
      );
    }

    next();
  };
};

/**
 * Email format validator middleware
 * Chain after validate() for fields that should be valid emails
 *
 * @param {string} field - Field name to validate as email
 * @returns {Function} Express middleware
 */
const validateEmail = (field = 'email') => {
  return (req, res, next) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const value = req.body[field];

    if (value && !emailRegex.test(value)) {
      throw ApiError.badRequest(`Invalid email format`, [
        { field, message: 'Please provide a valid email address' },
      ]);
    }

    next();
  };
};

module.exports = { validate, validateEmail };
