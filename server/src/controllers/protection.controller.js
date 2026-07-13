const asyncHandler = require('../utils/asyncHandler');
const protectionService = require('../services/protection.service');

/** Public — Electron background policy check */
const check = asyncHandler(async (req, res) => {
  const data = await protectionService.checkPolicy(req.body || {});
  return res.status(200).json(data);
});

module.exports = { check };
