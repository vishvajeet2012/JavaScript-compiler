const { Router } = require('express');
const apiController = require('../controllers/api.controller');
const { validate, validateEmail } = require('../middleware/validate');

const router = Router();

/**
 * API routes
 *
 * GET  /api/v1/info    — Application information
 * POST /api/v1/contact — Contact form submission
 */

router.get('/info', apiController.getInfo);

router.post(
  '/contact',
  validate(['name', 'email', 'message']),
  validateEmail('email'),
  apiController.submitContact
);

module.exports = router;
