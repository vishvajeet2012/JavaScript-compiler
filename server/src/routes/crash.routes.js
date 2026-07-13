const { Router } = require('express');
const crashController = require('../controllers/crash.controller');

const router = Router();

router.post('/', crashController.report);
router.post('/minidump', crashController.minidump);

module.exports = router;
