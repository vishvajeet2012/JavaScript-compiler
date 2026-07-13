const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const keyService = require('../services/key.service');
const telemetryService = require('../services/telemetry.service');
const protectionService = require('../services/protection.service');
const crashService = require('../services/crash.service');
const config = require('../config');

const login = asyncHandler(async (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== config.adminSecret) {
    return res.status(401).json({
      success: false,
      message: 'Invalid password',
      data: null,
    });
  }
  return ApiResponse.ok({ token: config.adminSecret }, 'Logged in').send(res);
});

const stats = asyncHandler(async (req, res) => {
  const data = await keyService.getStats();
  return ApiResponse.ok(data).send(res);
});

const listPlans = asyncHandler(async (req, res) => {
  const data = await keyService.listPlans();
  return ApiResponse.ok(data).send(res);
});

const createPlan = asyncHandler(async (req, res) => {
  const data = await keyService.createPlan(req.body || {});
  return ApiResponse.created(data, 'Plan created').send(res);
});

const updatePlan = asyncHandler(async (req, res) => {
  const data = await keyService.updatePlan(req.params.id, req.body || {});
  return ApiResponse.ok(data, 'Plan updated').send(res);
});

const deletePlan = asyncHandler(async (req, res) => {
  const data = await keyService.deletePlan(req.params.id);
  return ApiResponse.ok(data, 'Plan deleted').send(res);
});

const generateKeys = asyncHandler(async (req, res) => {
  const data = await keyService.generateKeys(req.body || {});
  return ApiResponse.created(data, `${data.length} key(s) generated`).send(res);
});

const listKeys = asyncHandler(async (req, res) => {
  const data = await keyService.listKeys(req.query);
  return ApiResponse.ok(data).send(res);
});

const getKey = asyncHandler(async (req, res) => {
  const data = await keyService.getKey(req.params.id);
  return ApiResponse.ok(data).send(res);
});

const revokeKey = asyncHandler(async (req, res) => {
  const data = await keyService.revokeKey(req.params.id);
  return ApiResponse.ok(data, 'Key revoked').send(res);
});

const revokeKeysBulk = asyncHandler(async (req, res) => {
  const data = await keyService.revokeKeysBulk(req.body || {});
  return ApiResponse.ok(data, `${data.revoked} key(s) revoked`).send(res);
});

const deleteKey = asyncHandler(async (req, res) => {
  const data = await keyService.deleteKey(req.params.id);
  return ApiResponse.ok(data, 'Key deleted').send(res);
});

const seedPlans = asyncHandler(async (req, res) => {
  const data = await keyService.seedDefaultPlans();
  return ApiResponse.ok(data, data.seeded ? 'Default plans seeded' : 'Plans already exist').send(
    res
  );
});

const usageOverview = asyncHandler(async (req, res) => {
  const data = await telemetryService.getOverview();
  return ApiResponse.ok(data).send(res);
});

const usageDevices = asyncHandler(async (req, res) => {
  const data = await telemetryService.listDevices(req.query);
  return ApiResponse.ok(data).send(res);
});

const usageDevice = asyncHandler(async (req, res) => {
  const data = await telemetryService.getDevice(req.params.machineId);
  return ApiResponse.ok(data).send(res);
});

const setDeviceProtection = asyncHandler(async (req, res) => {
  const data = await protectionService.setDeviceProtection(req.params.machineId, req.body || {});
  return ApiResponse.ok(data, 'Device protection updated').send(res);
});

const crashStats = asyncHandler(async (req, res) => {
  const data = await crashService.getStats();
  return ApiResponse.ok(data).send(res);
});

const listCrashes = asyncHandler(async (req, res) => {
  const data = await crashService.listCrashes(req.query);
  return ApiResponse.ok(data).send(res);
});

const deleteCrash = asyncHandler(async (req, res) => {
  const data = await crashService.deleteCrash(req.params.id);
  return ApiResponse.ok(data, 'Crash deleted').send(res);
});

module.exports = {
  login,
  stats,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  generateKeys,
  listKeys,
  getKey,
  revokeKey,
  revokeKeysBulk,
  deleteKey,
  seedPlans,
  crashStats,
  listCrashes,
  deleteCrash,
  usageOverview,
  usageDevices,
  usageDevice,
  setDeviceProtection,
};
