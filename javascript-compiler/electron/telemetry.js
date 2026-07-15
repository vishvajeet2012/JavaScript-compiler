/**
 * Silent usage telemetry
 * - Collects offline in SQLite
 * - Syncs to server when internet is available
 * - Never shown in the UI (main process only)
 */

const { app, powerMonitor } = require("electron");
const crypto = require("crypto");
const os = require("os");
const db = require("./db");
const { getMachineId } = require("./activation");

const HEARTBEAT_MS = 30 * 1000; // update session every 30s
const SYNC_MS = 2 * 60 * 1000; // try sync every 2 min
const BATCH_SIZE = 80;

let sessionId = null;
let sessionStartedAt = null;
let lastHeartbeatAt = null;
let activeMs = 0;
let isIdle = false;
let heartbeatTimer = null;
let syncTimer = null;
let syncing = false;
let counters = {
  run_code: 0,
  stop_code: 0,
  save_snippet: 0,
  delete_snippet: 0,
  create_folder: 0,
  activate: 0,
};

function serverBase() {
  try {
    return require("./activation").getServerUrl().replace(/\/$/, "");
  } catch {
    return "https://java-script-server.vercel.app";
  }
}

function deviceMeta() {
  let version = "0.0.0";
  try {
    version = app.getVersion();
  } catch {
    /* ignore */
  }
  const activation = db.getActivation();
  return {
    machineId: getMachineId(),
    appVersion: version,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    hostname: os.hostname(),
    locale: app.getLocale?.() || "en",
    isPro: activation?.is_pro === 1,
    activationKey: activation?.activation_key || null,
    snippetCount: db.getSnippetCount(),
    folderCount: db.getFolders().length,
  };
}

function ensureTables() {
  const database = db.initDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS usage_sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_ms INTEGER DEFAULT 0,
      active_ms INTEGER DEFAULT 0,
      run_count INTEGER DEFAULT 0,
      save_count INTEGER DEFAULT 0,
      stop_count INTEGER DEFAULT 0,
      delete_count INTEGER DEFAULT 0,
      folder_count INTEGER DEFAULT 0,
      activate_count INTEGER DEFAULT 0,
      is_pro INTEGER DEFAULT 0,
      app_version TEXT,
      platform TEXT,
      synced INTEGER DEFAULT 0,
      payload_json TEXT
    );

    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT UNIQUE,
      session_id TEXT,
      type TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_usage_sessions_synced ON usage_sessions(synced);
    CREATE INDEX IF NOT EXISTS idx_usage_events_synced ON usage_events(synced);
  `);
}

function newId(prefix = "") {
  return `${prefix}${crypto.randomBytes(12).toString("hex")}`;
}

function trackEvent(type, payload = {}) {
  try {
    ensureTables();
    if (counters[type] != null) counters[type] += 1;

    const eventId = newId("ev_");
    const createdAt = new Date().toISOString();
    db.initDb()
      .prepare(
        `INSERT INTO usage_events (event_id, session_id, type, payload_json, created_at, synced)
         VALUES (?, ?, ?, ?, ?, 0)`
      )
      .run(eventId, sessionId, type, JSON.stringify(payload || {}), createdAt);

    // opportunistic soft sync trigger for important events
    if (type === "activate" || type === "app_close") {
      setTimeout(() => {
        flushToServer().catch(() => {});
      }, 500);
    }
  } catch {
    // never break the app for telemetry
  }
}

function startSession() {
  try {
    ensureTables();
    sessionId = newId("ses_");
    sessionStartedAt = Date.now();
    lastHeartbeatAt = sessionStartedAt;
    activeMs = 0;
    isIdle = false;
    counters = {
      run_code: 0,
      stop_code: 0,
      save_snippet: 0,
      delete_snippet: 0,
      create_folder: 0,
      activate: 0,
    };

    const meta = deviceMeta();
    db.initDb()
      .prepare(
        `INSERT INTO usage_sessions (
          id, started_at, duration_ms, active_ms, is_pro, app_version, platform, synced, payload_json
        ) VALUES (?, ?, 0, 0, ?, ?, ?, 0, ?)`
      )
      .run(
        sessionId,
        new Date(sessionStartedAt).toISOString(),
        meta.isPro ? 1 : 0,
        meta.appVersion,
        meta.platform,
        JSON.stringify({ openMeta: meta })
      );

    trackEvent("app_open", { sessionId, ...meta });

    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);

    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      flushToServer().catch(() => {});
    }, SYNC_MS);

    // idle tracking (system idle)
    try {
      powerMonitor.on("suspend", () => {
        isIdle = true;
        heartbeat();
      });
      powerMonitor.on("resume", () => {
        isIdle = false;
        lastHeartbeatAt = Date.now();
        trackEvent("system_resume", {});
      });
      powerMonitor.on("lock-screen", () => {
        isIdle = true;
        heartbeat();
      });
      powerMonitor.on("unlock-screen", () => {
        isIdle = false;
        lastHeartbeatAt = Date.now();
      });
    } catch {
      /* powerMonitor may not exist in some envs */
    }

    // first sync attempt after short delay
    setTimeout(() => flushToServer().catch(() => {}), 8000);
  } catch {
    /* silent */
  }
}

function heartbeat() {
  if (!sessionId || !sessionStartedAt) return;
  try {
    const now = Date.now();
    const delta = Math.max(0, now - (lastHeartbeatAt || now));
    lastHeartbeatAt = now;

    // only count as active if not idle and system not idle long
    let systemIdle = false;
    try {
      systemIdle = powerMonitor.getSystemIdleTime() > 120; // 2 min
    } catch {
      systemIdle = false;
    }

    if (!isIdle && !systemIdle) {
      activeMs += delta;
    }

    const durationMs = Math.max(0, now - sessionStartedAt);
    db.initDb()
      .prepare(
        `UPDATE usage_sessions SET
          duration_ms=?, active_ms=?,
          run_count=?, save_count=?, stop_count=?, delete_count=?, folder_count=?, activate_count=?,
          is_pro=?
         WHERE id=?`
      )
      .run(
        durationMs,
        activeMs,
        counters.run_code,
        counters.save_snippet,
        counters.stop_code,
        counters.delete_snippet,
        counters.create_folder,
        counters.activate,
        db.getActivation()?.is_pro === 1 ? 1 : 0,
        sessionId
      );
  } catch {
    /* silent */
  }
}

function endSession() {
  try {
    if (!sessionId) return;
    heartbeat();
    const endedAt = new Date().toISOString();
    const durationMs = Math.max(0, Date.now() - sessionStartedAt);
    const meta = deviceMeta();

    db.initDb()
      .prepare(
        `UPDATE usage_sessions SET
          ended_at=?, duration_ms=?, active_ms=?,
          run_count=?, save_count=?, stop_count=?, delete_count=?, folder_count=?, activate_count=?,
          is_pro=?, payload_json=?, synced=0
         WHERE id=?`
      )
      .run(
        endedAt,
        durationMs,
        activeMs,
        counters.run_code,
        counters.save_snippet,
        counters.stop_code,
        counters.delete_snippet,
        counters.create_folder,
        counters.activate,
        meta.isPro ? 1 : 0,
        JSON.stringify({ closeMeta: meta, counters }),
        sessionId
      );

    trackEvent("app_close", {
      sessionId,
      durationMs,
      activeMs,
      counters,
      ...meta,
    });

    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (syncTimer) clearInterval(syncTimer);
  } catch {
    /* silent */
  }
}

async function isOnline() {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${serverBase()}/api/v1/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

function getUnsyncedBatch() {
  const database = db.initDb();
  const sessions = database
    .prepare(
      `SELECT * FROM usage_sessions
       WHERE synced=0 AND (ended_at IS NOT NULL OR duration_ms > 0)
       ORDER BY started_at ASC LIMIT ?`
    )
    .all(BATCH_SIZE);

  const events = database
    .prepare(
      `SELECT * FROM usage_events WHERE synced=0 ORDER BY id ASC LIMIT ?`
    )
    .all(BATCH_SIZE * 2);

  return { sessions, events };
}

function markSynced(sessionIds, eventIds) {
  const database = db.initDb();
  const markSession = database.prepare(`UPDATE usage_sessions SET synced=1 WHERE id=?`);
  const markEvent = database.prepare(`UPDATE usage_events SET synced=1 WHERE event_id=?`);
  const tx = database.transaction(() => {
    sessionIds.forEach((id) => markSession.run(id));
    eventIds.forEach((id) => markEvent.run(id));
  });
  tx();
}

/**
 * Optional: prune old synced rows to keep local DB small
 */
function pruneSynced(olderThanDays = 30) {
  try {
    const database = db.initDb();
    database
      .prepare(
        `DELETE FROM usage_events WHERE synced=1 AND created_at < datetime('now', ?)`
      )
      .run(`-${olderThanDays} days`);
    database
      .prepare(
        `DELETE FROM usage_sessions WHERE synced=1 AND started_at < datetime('now', ?) AND ended_at IS NOT NULL`
      )
      .run(`-${olderThanDays} days`);
  } catch {
    /* silent */
  }
}

async function flushToServer() {
  if (syncing) return { ok: false, reason: "busy" };
  syncing = true;
  try {
    // always refresh current session before push
    heartbeat();

    const online = await isOnline();
    if (!online) return { ok: false, reason: "offline" };

    const { sessions, events } = getUnsyncedBatch();
    if (!sessions.length && !events.length) return { ok: true, synced: 0 };

    const meta = deviceMeta();
    const body = {
      machineId: meta.machineId,
      appVersion: meta.appVersion,
      platform: meta.platform,
      arch: meta.arch,
      osRelease: meta.osRelease,
      hostname: meta.hostname,
      locale: meta.locale,
      isPro: meta.isPro,
      activationKey: meta.activationKey,
      snippetCount: meta.snippetCount,
      folderCount: meta.folderCount,
      sessions: sessions.map((s) => ({
        id: s.id,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        durationMs: s.duration_ms || 0,
        activeMs: s.active_ms || 0,
        runCount: s.run_count || 0,
        saveCount: s.save_count || 0,
        stopCount: s.stop_count || 0,
        deleteCount: s.delete_count || 0,
        folderCount: s.folder_count || 0,
        activateCount: s.activate_count || 0,
        isPro: s.is_pro === 1,
        appVersion: s.app_version,
        platform: s.platform,
        payload: safeJson(s.payload_json),
      })),
      events: events.map((e) => ({
        eventId: e.event_id,
        sessionId: e.session_id,
        type: e.type,
        payload: safeJson(e.payload_json),
        createdAt: e.created_at,
      })),
      clientSentAt: new Date().toISOString(),
    };

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${serverBase()}/api/telemetry/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telemetry-Client": "js-compiler-electron",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(t);

    if (!res.ok) return { ok: false, reason: `http_${res.status}` };

    markSynced(
      sessions.map((s) => s.id),
      events.map((e) => e.event_id)
    );
    pruneSynced(30);
    return { ok: true, synced: sessions.length + events.length };
  } catch {
    return { ok: false, reason: "error" };
  } finally {
    syncing = false;
  }
}

function safeJson(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Flush before quit (best effort, short timeout)
 */
async function flushOnQuit() {
  endSession();
  try {
    await Promise.race([
      flushToServer(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    /* ignore */
  }
}

module.exports = {
  startSession,
  endSession,
  trackEvent,
  heartbeat,
  flushToServer,
  flushOnQuit,
};
