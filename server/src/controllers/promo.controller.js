const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const promoService = require('../services/promo.service');
const announcementService = require('../services/announcement.service');
const releaseService = require('../services/release.service');

// ── Public ───────────────────────────────────────────────

const publicPromo = asyncHandler(async (req, res) => {
  const data = await promoService.getActivePublic();
  return ApiResponse.ok(data).send(res);
});

const publicAnnouncement = asyncHandler(async (req, res) => {
  const data = await announcementService.getActive();
  return ApiResponse.ok(data).send(res);
});

const publicReleaseNotes = asyncHandler(async (req, res) => {
  const data = await releaseService.getNotesForVersion(req.params.version);
  if (!data) {
    return res.status(404).json({
      success: false,
      message: 'No notes for this version',
      data: null,
    });
  }
  return ApiResponse.ok(data).send(res);
});

// ── Admin promo ──────────────────────────────────────────

const adminListPromo = asyncHandler(async (req, res) => {
  const data = await promoService.listAll();
  return ApiResponse.ok(data).send(res);
});

const adminCreatePromo = asyncHandler(async (req, res) => {
  const data = await promoService.create(req.body || {});
  return ApiResponse.created(data, 'Promo created').send(res);
});

const adminUpdatePromo = asyncHandler(async (req, res) => {
  const data = await promoService.update(req.params.id, req.body || {});
  return ApiResponse.ok(data, 'Promo updated').send(res);
});

const adminDeletePromo = asyncHandler(async (req, res) => {
  const data = await promoService.remove(req.params.id);
  return ApiResponse.ok(data, 'Promo deleted').send(res);
});

// ── Admin announcements ──────────────────────────────────

const adminListAnnouncements = asyncHandler(async (req, res) => {
  const data = await announcementService.listAll();
  return ApiResponse.ok(data).send(res);
});

const adminCreateAnnouncement = asyncHandler(async (req, res) => {
  const data = await announcementService.create(req.body || {});
  return ApiResponse.created(data, 'Message created').send(res);
});

const adminUpdateAnnouncement = asyncHandler(async (req, res) => {
  const data = await announcementService.update(req.params.id, req.body || {});
  return ApiResponse.ok(data, 'Message updated').send(res);
});

const adminDeleteAnnouncement = asyncHandler(async (req, res) => {
  const data = await announcementService.remove(req.params.id);
  return ApiResponse.ok(data, 'Message deleted').send(res);
});

module.exports = {
  publicPromo,
  publicAnnouncement,
  publicReleaseNotes,
  adminListPromo,
  adminCreatePromo,
  adminUpdatePromo,
  adminDeletePromo,
  adminListAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminDeleteAnnouncement,
};
