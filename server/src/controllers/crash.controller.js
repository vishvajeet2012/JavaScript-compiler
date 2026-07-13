const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const crashService = require('../services/crash.service');

/** Public — Electron silent crash upload */
const report = asyncHandler(async (req, res) => {
  const data = await crashService.ingest(req.body || {});
  return res.status(200).json({ success: true, ...data });
});

/** Electron crashReporter minidump endpoint (best-effort) */
const minidump = asyncHandler(async (req, res) => {
  const meta = { ...(req.body || {}), ...(req.query || {}) };
  const data = await crashService.ingestMinidump(meta);
  return res.status(200).json({ success: true, ...data });
});

const list = asyncHandler(async (req, res) => {
  const data = await crashService.listCrashes(req.query);
  return ApiResponse.ok(data).send(res);
});

const stats = asyncHandler(async (req, res) => {
  const data = await crashService.getStats();
  return ApiResponse.ok(data).send(res);
});

const remove = asyncHandler(async (req, res) => {
  const data = await crashService.deleteCrash(req.params.id);
  return ApiResponse.ok(data, 'Crash deleted').send(res);
});

module.exports = { report, minidump, list, stats, remove };
