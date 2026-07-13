const CrashReport = require('../models/CrashReport');
const ApiError = require('../utils/ApiError');

async function ingest(body = {}) {
  const message = String(body.message || body.error || 'Unknown crash').slice(0, 2000);
  if (!message) throw ApiError.badRequest('message required');

  const doc = await CrashReport.create({
    reportId: body.id || body.reportId || null,
    type: body.type || 'error',
    message,
    stack: body.stack ? String(body.stack).slice(0, 8000) : null,
    machineId: body.machineId || null,
    appVersion: body.appVersion || null,
    platform: body.platform || null,
    arch: body.arch || null,
    osRelease: body.osRelease || null,
    isPackaged: Boolean(body.isPackaged),
    extra: body.extra || null,
    clientTime: body.clientTime ? new Date(body.clientTime) : null,
    receivedAt: new Date(),
  });

  return { id: doc._id, ok: true };
}

/** Minidump multipart often not parsed — accept empty OK for crashReporter */
async function ingestMinidump(meta = {}) {
  const doc = await CrashReport.create({
    type: 'minidump',
    message: 'Native crash minidump received',
    machineId: meta.machineId || null,
    appVersion: meta.appVersion || null,
    platform: meta.platform || process.platform,
    extra: meta,
    receivedAt: new Date(),
  });
  return { id: doc._id, ok: true };
}

async function listCrashes({ limit = 100, q } = {}) {
  const filter = {};
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ message: rx }, { machineId: rx }, { type: rx }, { appVersion: rx }];
  }
  return CrashReport.find(filter)
    .sort({ receivedAt: -1 })
    .limit(Math.min(Number(limit) || 100, 300))
    .lean();
}

async function getStats() {
  const [total, last24h, byType] = await Promise.all([
    CrashReport.countDocuments(),
    CrashReport.countDocuments({
      receivedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    CrashReport.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
  ]);
  return {
    total,
    last24h,
    byType: Object.fromEntries((byType || []).map((r) => [r._id || 'unknown', r.count])),
  };
}

async function deleteCrash(id) {
  const doc = await CrashReport.findByIdAndDelete(id);
  if (!doc) throw ApiError.notFound('Crash not found');
  return { deleted: true };
}

module.exports = {
  ingest,
  ingestMinidump,
  listCrashes,
  getStats,
  deleteCrash,
};
