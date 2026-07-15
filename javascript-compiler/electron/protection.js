/**
 * System-level software protection (main process only)
 *
 * - Single instance lock
 * - Periodic license + server policy check
 * - Remote kill-switch / device block → auto quit
 * - Expired / revoked license → Pro strip
 * - Production: block DevTools unless --dev
 * - Offline grace, then enforce cached policy
 */

const { app, dialog, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");
const activation = require("./activation");

const CHECK_MS = 3 * 60 * 1000; // every 3 min
const STARTUP_DELAY_MS = 12 * 1000;

let checkTimer = null;
let enforcing = false;
let getMainWindow = () => null;

function serverBase() {
  try {
    return require("./activation").getServerUrl().replace(/\/$/, "");
  } catch {
    return "https://java-script-server.vercel.app";
  }
}

function policyCachePath() {
  return path.join(app.getPath("userData"), "data", "policy-cache.json");
}

function readPolicyCache() {
  try {
    const p = policyCachePath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function writePolicyCache(policy) {
  try {
    const dir = path.dirname(policyCachePath());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      policyCachePath(),
      JSON.stringify({ ...policy, cachedAt: new Date().toISOString() }, null, 2),
      "utf8"
    );
  } catch {
    /* silent */
  }
}

function fileFingerprint() {
  try {
    const mainPath = path.join(__dirname, "main.js");
    const buf = fs.readFileSync(mainPath);
    return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
  } catch {
    return "unknown";
  }
}

/**
 * Call once before app ready — second instance focuses first and exits.
 */
let hasSingleInstanceLock = false;

function enforceSingleInstance() {
  hasSingleInstanceLock = app.requestSingleInstanceLock();
  if (!hasSingleInstanceLock) {
    app.quit();
    return false;
  }
  app.on("second-instance", () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  return true;
}

function hasLock() {
  return hasSingleInstanceLock;
}

function lockDownDevTools(win) {
  if (!win || process.argv.includes("--dev") || !app.isPackaged) return;
  win.webContents.on("devtools-opened", () => {
    try {
      win.webContents.closeDevTools();
    } catch {
      /* ignore */
    }
  });
  // Block common open shortcuts at window level
  win.webContents.on("before-input-event", (event, input) => {
    const key = (input.key || "").toLowerCase();
    if (input.control && input.shift && (key === "i" || key === "j" || key === "c")) {
      event.preventDefault();
    }
    if (key === "f12") event.preventDefault();
  });
}

async function fetchServerPolicy() {
  const machineId = activation.getMachineId();
  const act = db.getActivation();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${serverBase()}/api/protection/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machineId,
        appVersion: app.getVersion(),
        platform: process.platform,
        isPro: act?.is_pro === 1,
        activationKey: act?.activation_key || null,
        token: act?.token || null,
        fingerprint: fileFingerprint(),
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    writePolicyCache(data);
    return data;
  } catch {
    clearTimeout(t);
    return null;
  }
}

function applyLocalLicenseRules() {
  const act = db.getActivation();
  if (!act?.is_pro) return { ok: true };

  // Machine binding
  const mid = activation.getMachineId();
  if (act.machine_id && act.machine_id !== mid) {
    db.clearActivation();
    db.setSetting("license_expires_at", "");
    return { ok: false, reason: "Machine mismatch — Pro revoked", stripPro: true };
  }

  // Cached expiry from last successful verify/activate
  const expiresAt = db.getSetting("license_expires_at", null);
  if (expiresAt) {
    const exp = new Date(expiresAt).getTime();
    if (!Number.isNaN(exp) && Date.now() > exp) {
      db.clearActivation();
      db.setSetting("license_expires_at", "");
      return { ok: false, reason: "License expired — Pro revoked", stripPro: true };
    }
  }

  return { ok: true };
}

async function revalidateProOnline() {
  const act = db.getActivation();
  if (!act?.is_pro) return { ok: true };
  try {
    const result = await activation.verifyActivation();
    if (!result.isPro && !result.offline) {
      return { ok: false, reason: result.message || "License invalid", stripPro: true };
    }
    return { ok: true, offline: !!result.offline };
  } catch {
    return { ok: true, offline: true };
  }
}

async function forceQuitApp(reason) {
  if (enforcing) return;
  enforcing = true;

  try {
    db.setSetting("protection_block_reason", reason || "Blocked by policy");
    db.setSetting("protection_blocked", "1");
  } catch {
    /* ignore */
  }

  const win = getMainWindow();
  const message = reason || "This installation has been blocked.";

  try {
    if (win && !win.isDestroyed()) {
      await dialog.showMessageBox(win, {
        type: "error",
        title: "JS Compiler — Access denied",
        message: "Application blocked",
        detail: `${message}\n\nThe app will now close.`,
        buttons: ["OK"],
        noLink: true,
      });
    } else {
      await dialog.showMessageBox({
        type: "error",
        title: "JS Compiler — Access denied",
        message: "Application blocked",
        detail: message,
        buttons: ["OK"],
      });
    }
  } catch {
    /* ignore */
  }

  try {
    BrowserWindow.getAllWindows().forEach((w) => {
      try {
        w.destroy();
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }

  app.exit(1);
}

function notifyProRevoked(reason) {
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return;
  dialog
    .showMessageBox(win, {
      type: "warning",
      title: "Pro license",
      message: "Pro access removed",
      detail: reason || "Your license is no longer valid. Free mode continues.",
      buttons: ["OK"],
    })
    .catch(() => {});
  // Refresh renderer pro badge if possible
  try {
    win.webContents.send("protection-pro-revoked", { reason });
  } catch {
    /* ignore */
  }
}

async function runProtectionCheck() {
  if (enforcing) return;

  // 1) Local license rules (expiry / machine)
  const local = applyLocalLicenseRules();
  if (local.stripPro) notifyProRevoked(local.reason);

  // 2) Online pro re-validate
  const onlinePro = await revalidateProOnline();
  if (onlinePro.stripPro) notifyProRevoked(onlinePro.reason);

  // 3) Server policy / kill-switch
  const policy = await fetchServerPolicy();
  const cached = policy || readPolicyCache();

  if (policy) {
    // Clear previous block if server says allowed
    if (policy.allowed !== false && !policy.forceQuit && !policy.blocked) {
      db.setSetting("protection_blocked", "0");
      db.setSetting("protection_block_reason", "");
    }

    if (policy.minVersion && isVersionOlder(app.getVersion(), policy.minVersion)) {
      await forceQuitApp(
        `This version is too old. Minimum required: v${policy.minVersion}. Please update.`
      );
      return;
    }

    if (policy.blocked || policy.forceQuit || policy.allowed === false) {
      await forceQuitApp(policy.reason || "Device blocked by administrator.");
      return;
    }

    if (policy.revokePro) {
      db.clearActivation();
      notifyProRevoked(policy.reason || "Pro revoked by server");
    }

    if (policy.licenseExpiresAt) {
      db.setSetting("license_expires_at", String(policy.licenseExpiresAt));
    }
  } else if (cached) {
    // Offline: honor last known kill-switch from server
    if (cached.blocked || cached.forceQuit || cached.allowed === false) {
      await forceQuitApp(cached.reason || "Device blocked (offline policy cache).");
      return;
    }
  }

  // Startup local flag
  if (db.getSetting("protection_blocked") === "1") {
    await forceQuitApp(db.getSetting("protection_block_reason", "Device blocked."));
  }
}

function isVersionOlder(current, minimum) {
  const parse = (v) =>
    String(v || "0")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const a = parse(current);
  const b = parse(minimum);
  for (let i = 0; i < 3; i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}

function startProtection({ getWindow }) {
  getMainWindow = typeof getWindow === "function" ? getWindow : () => null;

  const win = getMainWindow();
  if (win) lockDownDevTools(win);

  // Immediate local block flag check
  if (db.getSetting("protection_blocked") === "1") {
    setTimeout(() => {
      forceQuitApp(db.getSetting("protection_block_reason", "Device blocked."));
    }, 800);
  }

  setTimeout(() => {
    runProtectionCheck().catch(() => {});
  }, STARTUP_DELAY_MS);

  if (checkTimer) clearInterval(checkTimer);
  checkTimer = setInterval(() => {
    runProtectionCheck().catch(() => {});
  }, CHECK_MS);
}

function onWindowCreated(win) {
  lockDownDevTools(win);
}

module.exports = {
  enforceSingleInstance,
  hasLock,
  startProtection,
  onWindowCreated,
  runProtectionCheck,
  forceQuitApp,
};
