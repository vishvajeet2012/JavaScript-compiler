const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const releaseService = require('../services/release.service');
const r2 = require('../services/r2.service');

// ── Public ───────────────────────────────────────────────

const listHome = asyncHandler(async (req, res) => {
  const data = await releaseService.listHome();
  return ApiResponse.ok(data).send(res);
});

const listHistory = asyncHandler(async (req, res) => {
  const data = await releaseService.listHistory();
  return ApiResponse.ok(data).send(res);
});

const getByVersion = asyncHandler(async (req, res) => {
  const data = await releaseService.getByVersion(req.params.version);
  return ApiResponse.ok(data).send(res);
});

const resolveDownload = asyncHandler(async (req, res) => {
  const platform = req.query.platform || 'windows';
  const data = await releaseService.resolvePlatformDownload(platform);
  if (!data?.url) {
    return res.status(404).json({
      success: false,
      message: `No managed release file for platform "${platform}"`,
      data: null,
    });
  }
  return ApiResponse.ok(data).send(res);
});

// ── Admin ────────────────────────────────────────────────

const adminList = asyncHandler(async (req, res) => {
  const data = await releaseService.listAll({ ...req.query, admin: '1' });
  return ApiResponse.ok({
    releases: data,
    r2Configured: r2.isConfigured(),
  }).send(res);
});

const adminGet = asyncHandler(async (req, res) => {
  const data = await releaseService.getById(req.params.id);
  return ApiResponse.ok(data).send(res);
});

const adminCreate = asyncHandler(async (req, res) => {
  const data = await releaseService.create(req.body || {});
  return ApiResponse.created(data, 'Release created').send(res);
});

const adminUpdate = asyncHandler(async (req, res) => {
  const data = await releaseService.update(req.params.id, req.body || {});
  return ApiResponse.ok(data, 'Release updated').send(res);
});

const adminDelete = asyncHandler(async (req, res) => {
  const data = await releaseService.remove(req.params.id);
  return ApiResponse.ok(data, 'Release deleted').send(res);
});

const adminUpsertPlatform = asyncHandler(async (req, res) => {
  const data = await releaseService.upsertPlatform(req.params.id, req.body || {});
  return ApiResponse.ok(data, 'Platform saved').send(res);
});

const adminPresign = asyncHandler(async (req, res) => {
  const data = await releaseService.presignUpload(req.params.id, req.body || {});
  return ApiResponse.ok(data, 'Presigned upload URL ready').send(res);
});

const adminConfirmUpload = asyncHandler(async (req, res) => {
  const data = await releaseService.confirmR2Upload(req.params.id, req.body || {});
  return ApiResponse.ok(data, 'R2 file attached to release').send(res);
});

module.exports = {
  listHome,
  listHistory,
  getByVersion,
  resolveDownload,
  adminList,
  adminGet,
  adminCreate,
  adminUpdate,
  adminDelete,
  adminUpsertPlatform,
  adminPresign,
  adminConfirmUpload,
};
