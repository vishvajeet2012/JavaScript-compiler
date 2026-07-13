const { Router } = require('express');
const apiRoutes = require('./api.routes');
const healthRoutes = require('./health.routes');
const config = require('../config');

const router = Router();

/**
 * Route aggregator
 * Mounts all route modules under the API version prefix
 */
router.use(`${config.apiPrefix}/health`, healthRoutes);
router.use(`${config.apiPrefix}`, apiRoutes);

module.exports = router;
