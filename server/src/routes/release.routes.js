const { Router } = require('express');
const releaseController = require('../controllers/release.controller');

const router = Router();

// Public
router.get('/home', releaseController.listHome);
router.get('/history', releaseController.listHistory);
router.get('/download-resolve', releaseController.resolveDownload);
router.get('/version/:version', releaseController.getByVersion);

module.exports = router;
