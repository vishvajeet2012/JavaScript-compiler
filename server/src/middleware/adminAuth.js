const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Simple admin auth via Bearer token / x-admin-key header.
 * Token must match ADMIN_SECRET from config.
 */
function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const key = req.headers['x-admin-key'] || bearer || req.query.adminKey;

  if (!key || key !== config.adminSecret) {
    return next(ApiError.unauthorized('Invalid admin credentials'));
  }
  return next();
}

module.exports = adminAuth;
