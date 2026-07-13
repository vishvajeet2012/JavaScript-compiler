const asyncHandler = require('../utils/asyncHandler');
const keyService = require('../services/key.service');

/**
 * Electron-compatible activation endpoints.
 * Response shape matches old activation-server for drop-in use.
 */

const activate = asyncHandler(async (req, res) => {
  try {
    const result = await keyService.activateKey(req.body || {});
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.message || 'Activation failed' });
  }
});

const verify = asyncHandler(async (req, res) => {
  try {
    const result = await keyService.verifyKey(req.body || {});
    return res.status(200).json(result);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ valid: false, message: err.message || 'Verify failed' });
  }
});

const health = asyncHandler(async (req, res) => {
  return res.status(200).json({ status: 'ok', service: 'activation' });
});

module.exports = { activate, verify, health };
