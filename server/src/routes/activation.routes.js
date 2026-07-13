const { Router } = require('express');
const activationController = require('../controllers/activation.controller');
const protectionController = require('../controllers/protection.controller');

const router = Router();

router.post('/activate', activationController.activate);
router.post('/verify', activationController.verify);
router.get('/health', activationController.health);

// System protection / kill-switch policy (Electron silent)
router.post('/protection/check', protectionController.check);

module.exports = router;
