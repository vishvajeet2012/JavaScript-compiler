const { Router } = require('express');
const apiController = require('../controllers/api.controller');
const purchaseController = require('../controllers/purchase.controller');
const { validate, validateEmail } = require('../middleware/validate');

const router = Router();

/**
 * API routes
 *
 * GET  /api/v1/info      — Application information
 * GET  /api/v1/landing   — Home / landing page content
 * POST /api/v1/contact   — Contact form submission
 * GET  /api/v1/plans     — Public pricing plans
 * POST /api/v1/purchase  — Buy license key (demo checkout)
 * GET  /api/v1/orders/:orderId — Order lookup
 */

router.get('/info', apiController.getInfo);
router.get('/landing', apiController.getLanding);

router.post(
  '/contact',
  validate(['name', 'email', 'message']),
  validateEmail('email'),
  apiController.submitContact
);

// Storefront / purchase
router.get('/plans', purchaseController.listPlans);
router.post(
  '/purchase',
  validate(['planId', 'name', 'email']),
  validateEmail('email'),
  purchaseController.purchase
);
router.get('/orders/:orderId', purchaseController.getOrder);

module.exports = router;
