/**
 * Silent crash / error reporting
 * - Uses Electron crashReporter when packaged
 * - Also captures uncaught exceptions → POST /api/crashes
 * - Never shown in UI
 */

const { app, crashReporter } = require("electron");
const os = require("os");
const db = require("./db");
const { getMachineId } = require("./activation");

const QUEUE_KEY = "crash_report_queue";
let started = false;

function serverBase() {
  return db.getSetting("activation_server", "http://localhost:5000").replace(/\/$/, "");
}

function baseMeta() {
  let version = "0.0.0";
  try {
    version = app.getVersion();
  } catch {
    /* ignore */
  }
  return {
    machineId: getMachineId(),
    appVersion: version,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    isPackaged: app.isPackaged,
  };
}

function readQueue() {
  try {
    const raw = db.getSetting(QUEUE_KEY, "[]");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeQueue(items) {
  try {
    db.setSetting(QUEUE_KEY, JSON.stringify(items.slice(-50)));
  } catch {
    /* ignore */
  }
}

function enqueue(report) {
  const q = readQueue();
  q.push({
    ...report,
    id: `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    clientTime: new Date().toISOString(),
  });
  writeQueue(q);
}

async function flushQueue() {
  const q = readQueue();
  if (!q.length) return { ok: true, sent: 0 };

  const remaining = [];
  let sent = 0;

  for (const item of q) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${serverBase()}/api/crashes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) sent += 1;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { ok: true, sent };
}

function reportError(type, error, extra = {}) {
  try {
    const message = error?.message || String(error);
    const stack = error?.stack || null;
    enqueue({
      type: type || "error",
      message: String(message).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 8000) : null,
      extra,
      ...baseMeta(),
    });
    // opportunistic flush
    setTimeout(() => flushQueue().catch(() => {}), 1500);
  } catch {
    /* never throw */
  }
}

function startCrashReporter() {
  if (started) return;
  started = true;

  try {
    // Electron native crash dumps (minidumps) — upload URL optional
    crashReporter.start({
      productName: "JS Compiler",
      companyName: "vishvajeet shukla",
      submitURL: `${serverBase()}/api/crashes/minidump`,
      uploadToServer: true,
      compress: true,
      ignoreSystemCrashHandler: false,
      extra: {
        machineId: getMachineId(),
        appVersion: app.getVersion(),
      },
    });
  } catch {
    /* crashReporter may fail in some envs — continue with JS reports */
  }

  process.on("uncaughtException", (err) => {
    reportError("uncaughtException", err);
  });

  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    reportError("unhandledRejection", err);
  });

  // Flush any offline queued crashes
  setTimeout(() => flushQueue().catch(() => {}), 10000);
  setInterval(() => flushQueue().catch(() => {}), 5 * 60 * 1000);
}

module.exports = {
  startCrashReporter,
  reportError,
  flushQueue,
};
