const { Router } = require('express');
const apiRoutes = require('./api.routes');
const healthRoutes = require('./health.routes');
const adminRoutes = require('./admin.routes');
const activationRoutes = require('./activation.routes');
const telemetryRoutes = require('./telemetry.routes');
const crashRoutes = require('./crash.routes');
const releaseRoutes = require('./release.routes');
const config = require('../config');

const router = Router();

/**
 * Root — browser-friendly API landing (fixes GET / 404 on Vercel)
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'JS Compiler API is running',
    service: 'java-script-server',
    publisher: 'vishvajeetshukla.in',
    endpoints: {
      health: `${config.apiPrefix}/health`,
      info: `${config.apiPrefix}/info`,
      landing: `${config.apiPrefix}/landing`,
      plans: `${config.apiPrefix}/plans`,
      releasesHome: `${config.apiPrefix}/releases/home`,
      releasesHistory: `${config.apiPrefix}/releases/history`,
      purchase: `POST ${config.apiPrefix}/purchase`,
      activate: 'POST /api/activate',
      verify: 'POST /api/verify',
      admin: `${config.apiPrefix}/admin/*`,
    },
    docs: 'https://github.com/vishvajeet2012/JavaScript-compiler',
  });
});

/**
 * Route aggregator
 * Mounts all route modules under the API version prefix
 */
router.use(`${config.apiPrefix}/health`, healthRoutes);
router.use(`${config.apiPrefix}/admin`, adminRoutes);
router.use(`${config.apiPrefix}/releases`, releaseRoutes);
router.use(`${config.apiPrefix}`, apiRoutes);

// Electron app activation + silent usage telemetry + crashes
router.use('/api', activationRoutes);
router.use('/api/telemetry', telemetryRoutes);
router.use('/api/crashes', crashRoutes);

module.exports = router;
