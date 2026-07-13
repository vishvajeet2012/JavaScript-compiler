const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const apiService = require('../services/api.service');

/**
 * API controller — handles request/response, delegates logic to services
 */

/**
 * GET /api/v1/info
 * Returns general application information
 */
const getInfo = asyncHandler(async (req, res) => {
  const info = apiService.getAppInfo();
  ApiResponse.ok(info, 'Application info retrieved').send(res);
});

/**
 * GET /api/v1/landing
 * Returns home / landing page content for next-app
 */
const getLanding = asyncHandler(async (req, res) => {
  const landing = apiService.getLandingContent();
  ApiResponse.ok(landing, 'Landing content retrieved').send(res);
});

/**
 * POST /api/v1/contact
 * Processes a contact form submission from the landing page
 *
 * Body: { name: string, email: string, message: string }
 */
const submitContact = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;

  const result = await apiService.processContactForm({ name, email, message });

  ApiResponse.created(result, 'Contact form submitted successfully').send(res);
});

module.exports = {
  getInfo,
  getLanding,
  submitContact,
};
