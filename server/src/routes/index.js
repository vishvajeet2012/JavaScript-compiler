const { Router } = require('express');
const apiRoutes = require('./api.routes');
const healthRoutes = require('./health.routes');
const adminRoutes = require('./admin.routes');
const activationRoutes = require('./activation.routes');
const telemetryRoutes = require('./telemetry.routes');
const crashRoutes = require('./crash.routes');
const config = require('../config');

const router = Router();

/**
 * Route aggregator
 * Mounts all route modules under the API version prefix
 */
router.use(`${config.apiPrefix}/health`, healthRoutes);
router.use(`${config.apiPrefix}/admin`, adminRoutes);
router.use(`${config.apiPrefix}`, apiRoutes);

// Electron app activation + silent usage telemetry + crashes
router.use('/api', activationRoutes);
router.use('/api/telemetry', telemetryRoutes);
router.use('/api/crashes', crashRoutes);

module.exports = router;
