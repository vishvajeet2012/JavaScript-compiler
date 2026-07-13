const DeviceUsage = require('../models/DeviceUsage');
const ApiError = require('../utils/ApiError');

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDuration(ms) {
  const totalSec = Math.floor((ms || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Silent batch sync from Electron clients (offline queue flush)
 */
async function syncBatch(body = {}) {
  const machineId = String(body.machineId || '').trim();
  if (!machineId) throw ApiError.badRequest('machineId required');

  let device = await DeviceUsage.findOne({ machineId });
  if (!device) {
    device = new DeviceUsage({
      machineId,
      firstSeenAt: new Date(),
      sessions: [],
      events: [],
    });
  }

  // Device profile snapshot
  if (body.appVersion != null) device.appVersion = body.appVersion;
  if (body.platform != null) device.platform = body.platform;
  if (body.arch != null) device.arch = body.arch;
  if (body.osRelease != null) device.osRelease = body.osRelease;
  if (body.hostname != null) device.hostname = body.hostname;
  if (body.locale != null) device.locale = body.locale;
  if (body.isPro != null) device.isPro = Boolean(body.isPro);
  if (body.activationKey !== undefined) device.activationKey = body.activationKey || null;
  if (body.snippetCount != null) device.snippetCount = Number(body.snippetCount) || 0;
  if (body.folderCount != null) device.folderCount = Number(body.folderCount) || 0;

  const now = new Date();
  device.lastSeenAt = now;
  device.lastSyncAt = now;

  const existingSessionIds = new Set((device.sessions || []).map((s) => s.sessionId));
  const existingEventIds = new Set((device.events || []).map((e) => e.eventId));

  let sessionsUpserted = 0;
  let eventsAdded = 0;

  for (const s of body.sessions || []) {
    if (!s?.id) continue;
    const startedAt = toDate(s.startedAt) || now;
    const endedAt = toDate(s.endedAt);
    const durationMs = Number(s.durationMs) || 0;
    const activeMs = Number(s.activeMs) || 0;

    if (existingSessionIds.has(s.id)) {
      // Update in place (heartbeat / end of session)
      const idx = device.sessions.findIndex((x) => x.sessionId === s.id);
      if (idx >= 0) {
        const prev = device.sessions[idx];
        const prevDuration = prev.durationMs || 0;
        const prevActive = prev.activeMs || 0;
        const prevRun = prev.runCount || 0;
        const prevSave = prev.saveCount || 0;
        const prevStop = prev.stopCount || 0;
        const prevDel = prev.deleteCount || 0;
        const prevAct = prev.activateCount || 0;

        device.totalDurationMs = Math.max(
          0,
          (device.totalDurationMs || 0) - prevDuration + durationMs
        );
        device.totalActiveMs = Math.max(0, (device.totalActiveMs || 0) - prevActive + activeMs);
        device.totalRuns = Math.max(0, (device.totalRuns || 0) - prevRun + (Number(s.runCount) || 0));
        device.totalSaves = Math.max(
          0,
          (device.totalSaves || 0) - prevSave + (Number(s.saveCount) || 0)
        );
        device.totalStops = Math.max(
          0,
          (device.totalStops || 0) - prevStop + (Number(s.stopCount) || 0)
        );
        device.totalDeletes = Math.max(
          0,
          (device.totalDeletes || 0) - prevDel + (Number(s.deleteCount) || 0)
        );
        device.totalActivations = Math.max(
          0,
          (device.totalActivations || 0) - prevAct + (Number(s.activateCount) || 0)
        );

        device.sessions[idx] = {
          sessionId: s.id,
          startedAt,
          endedAt,
          durationMs,
          activeMs,
          runCount: Number(s.runCount) || 0,
          saveCount: Number(s.saveCount) || 0,
          stopCount: Number(s.stopCount) || 0,
          deleteCount: Number(s.deleteCount) || 0,
          folderCount: Number(s.folderCount) || 0,
          activateCount: Number(s.activateCount) || 0,
          isPro: Boolean(s.isPro),
          appVersion: s.appVersion || device.appVersion,
          platform: s.platform || device.platform,
          payload: s.payload || null,
          lastSyncedAt: now,
        };
        sessionsUpserted += 1;
      }
    } else {
      device.sessions.push({
        sessionId: s.id,
        startedAt,
        endedAt,
        durationMs,
        activeMs,
        runCount: Number(s.runCount) || 0,
        saveCount: Number(s.saveCount) || 0,
        stopCount: Number(s.stopCount) || 0,
        deleteCount: Number(s.deleteCount) || 0,
        folderCount: Number(s.folderCount) || 0,
        activateCount: Number(s.activateCount) || 0,
        isPro: Boolean(s.isPro),
        appVersion: s.appVersion || device.appVersion,
        platform: s.platform || device.platform,
        payload: s.payload || null,
        lastSyncedAt: now,
      });
      existingSessionIds.add(s.id);
      device.totalSessions = (device.totalSessions || 0) + 1;
      device.totalDurationMs = (device.totalDurationMs || 0) + durationMs;
      device.totalActiveMs = (device.totalActiveMs || 0) + activeMs;
      device.totalRuns = (device.totalRuns || 0) + (Number(s.runCount) || 0);
      device.totalSaves = (device.totalSaves || 0) + (Number(s.saveCount) || 0);
      device.totalStops = (device.totalStops || 0) + (Number(s.stopCount) || 0);
      device.totalDeletes = (device.totalDeletes || 0) + (Number(s.deleteCount) || 0);
      device.totalActivations = (device.totalActivations || 0) + (Number(s.activateCount) || 0);
      sessionsUpserted += 1;
    }
  }

  for (const e of body.events || []) {
    if (!e?.eventId || existingEventIds.has(e.eventId)) continue;
    device.events.push({
      eventId: e.eventId,
      sessionId: e.sessionId || null,
      type: e.type || 'unknown',
      payload: e.payload || null,
      createdAt: toDate(e.createdAt) || now,
    });
    existingEventIds.add(e.eventId);
    eventsAdded += 1;
  }

  await device.save();

  return {
    ok: true,
    machineId,
    sessionsUpserted,
    eventsAdded,
    totals: {
      totalSessions: device.totalSessions,
      totalDurationMs: device.totalDurationMs,
      totalActiveMs: device.totalActiveMs,
      totalRuns: device.totalRuns,
      totalSaves: device.totalSaves,
    },
  };
}

async function listDevices({ q, limit = 100 } = {}) {
  const filter = {};
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ machineId: rx }, { hostname: rx }, { activationKey: rx }, { platform: rx }];
  }

  const rows = await DeviceUsage.find(filter)
    .sort({ lastSeenAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
    .select('-events -sessions')
    .lean();

  return rows.map((d) => ({
    ...d,
    totalDurationHuman: formatDuration(d.totalDurationMs),
    totalActiveHuman: formatDuration(d.totalActiveMs),
  }));
}

async function getDevice(machineId) {
  const device = await DeviceUsage.findOne({ machineId }).lean();
  if (!device) throw ApiError.notFound('Device not found');

  return {
    ...device,
    totalDurationHuman: formatDuration(device.totalDurationMs),
    totalActiveHuman: formatDuration(device.totalActiveMs),
    sessions: (device.sessions || [])
      .slice()
      .reverse()
      .slice(0, 100)
      .map((s) => ({
        ...s,
        durationHuman: formatDuration(s.durationMs),
        activeHuman: formatDuration(s.activeMs),
      })),
    events: (device.events || []).slice().reverse().slice(0, 200),
  };
}

async function getOverview() {
  const [devices, aggregates] = await Promise.all([
    DeviceUsage.countDocuments(),
    DeviceUsage.aggregate([
      {
        $group: {
          _id: null,
          totalDurationMs: { $sum: '$totalDurationMs' },
          totalActiveMs: { $sum: '$totalActiveMs' },
          totalSessions: { $sum: '$totalSessions' },
          totalRuns: { $sum: '$totalRuns' },
          totalSaves: { $sum: '$totalSaves' },
          proUsers: { $sum: { $cond: ['$isPro', 1, 0] } },
        },
      },
    ]),
  ]);

  const a = aggregates[0] || {};
  return {
    devices,
    proUsers: a.proUsers || 0,
    freeUsers: Math.max(0, devices - (a.proUsers || 0)),
    totalSessions: a.totalSessions || 0,
    totalDurationMs: a.totalDurationMs || 0,
    totalActiveMs: a.totalActiveMs || 0,
    totalDurationHuman: formatDuration(a.totalDurationMs || 0),
    totalActiveHuman: formatDuration(a.totalActiveMs || 0),
    totalRuns: a.totalRuns || 0,
    totalSaves: a.totalSaves || 0,
  };
}

module.exports = {
  syncBatch,
  listDevices,
  getDevice,
  getOverview,
  formatDuration,
};
