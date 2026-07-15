const { Router } = require('express');
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/admin.controller');
const releaseController = require('../controllers/release.controller');

const router = Router();

// Public login
router.post('/login', adminController.login);

// Protected admin routes
router.use(adminAuth);

// Releases (home line + history + R2)
router.get('/releases', releaseController.adminList);
router.post('/releases', releaseController.adminCreate);
router.get('/releases/:id', releaseController.adminGet);
router.patch('/releases/:id', releaseController.adminUpdate);
router.delete('/releases/:id', releaseController.adminDelete);
router.post('/releases/:id/platforms', releaseController.adminUpsertPlatform);
router.post('/releases/:id/presign', releaseController.adminPresign);
router.post('/releases/:id/confirm-upload', releaseController.adminConfirmUpload);

router.get('/stats', adminController.stats);
router.post('/seed', adminController.seedPlans);

router.get('/plans', adminController.listPlans);
router.post('/plans', adminController.createPlan);
router.patch('/plans/:id', adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);

router.get('/keys', adminController.listKeys);
router.post('/keys/generate', adminController.generateKeys);
router.post('/keys/revoke-bulk', adminController.revokeKeysBulk);
router.get('/keys/:id', adminController.getKey);
router.post('/keys/:id/revoke', adminController.revokeKey);
router.delete('/keys/:id', adminController.deleteKey);

router.get('/orders', adminController.listOrders);

router.get('/crashes/stats', adminController.crashStats);
router.get('/crashes', adminController.listCrashes);
router.delete('/crashes/:id', adminController.deleteCrash);

// Usage analytics (silent Electron telemetry — admin only)
router.get('/usage/overview', adminController.usageOverview);
router.get('/usage/devices', adminController.usageDevices);
router.get('/usage/devices/:machineId', adminController.usageDevice);
router.post('/usage/devices/:machineId/protection', adminController.setDeviceProtection);

module.exports = router;
