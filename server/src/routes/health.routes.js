const { Router } = require('express');
const healthController = require('../controllers/health.controller');

const router = Router();

/**
 * Health check routes
 * GET /api/v1/health — Server health status
 */
router.get('/', healthController.getHealth);

module.exports = router;
