const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const telemetryService = require('../services/telemetry.service');

/** Public (Electron silent sync) — no user-facing UI */
const sync = asyncHandler(async (req, res) => {
  const data = await telemetryService.syncBatch(req.body || {});
  // Minimal response — clients only care about ok
  return res.status(200).json({ success: true, ...data });
});

const overview = asyncHandler(async (req, res) => {
  const data = await telemetryService.getOverview();
  return ApiResponse.ok(data).send(res);
});

const listDevices = asyncHandler(async (req, res) => {
  const data = await telemetryService.listDevices(req.query);
  return ApiResponse.ok(data).send(res);
});

const getDevice = asyncHandler(async (req, res) => {
  const data = await telemetryService.getDevice(req.params.machineId);
  return ApiResponse.ok(data).send(res);
});

module.exports = { sync, overview, listDevices, getDevice };
