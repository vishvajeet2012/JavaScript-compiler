const { Router } = require('express');
const telemetryController = require('../controllers/telemetry.controller');

const router = Router();

// Electron background sync (no auth — machineId is the identity)
router.post('/sync', telemetryController.sync);

module.exports = router;
