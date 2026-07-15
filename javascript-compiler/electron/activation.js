const { machineIdSync } = require("node-machine-id");
const crypto = require("crypto");
const { getActivation, saveActivation, clearActivation } = require("./db");

// Production activation API — hardcoded fallback (never localhost in UI)
// Keep in sync with next-app FALLBACK_API_URL
const DEFAULT_SERVER = "https://java-script-server.vercel.app";
const FREE_SNIPPET_LIMIT = 5;

function getMachineId() {
  return crypto.createHash("sha256").update(machineIdSync(true)).digest("hex").slice(0, 32);
}

/** Always production URL (ignores old localhost settings). */
function getServerUrl() {
  return DEFAULT_SERVER;
}

/**
 * Wipe stale local overrides (e.g. http://localhost:5000) so activation
 * always hits production after update.
 */
function ensureProductionServer() {
  try {
    const { setSetting, getSetting } = require("./db");
    const current = String(getSetting("activation_server", "") || "");
    if (
      !current ||
      current !== DEFAULT_SERVER ||
      /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(current)
    ) {
      setSetting("activation_server", DEFAULT_SERVER);
    }
  } catch {
    /* ignore */
  }
}

function cacheLicenseMeta(result) {
  const { setSetting } = require("./db");
  if (result.expiresAt) setSetting("license_expires_at", String(result.expiresAt));
  else setSetting("license_expires_at", "");
  if (result.planName) setSetting("license_plan_name", String(result.planName));
  if (result.planCode) setSetting("license_plan_code", String(result.planCode));
  if (result.maxDevices != null) setSetting("license_max_devices", String(result.maxDevices));
}

function isLicenseExpiredLocally() {
  const { getSetting } = require("./db");
  const raw = getSetting("license_expires_at", "");
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() > t;
}

async function validateOnline(key, machineId) {
  const server = getServerUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${server}/api/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key.trim().toUpperCase(), machineId }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.message || "Activation failed" };
    }

    const data = await res.json();
    return {
      success: true,
      token: data.token,
      message: data.message,
      expiresAt: data.expiresAt || null,
      planName: data.planName || null,
      planCode: data.planCode || null,
      maxDevices: data.maxDevices || null,
      devicesUsed: data.devicesUsed || null,
      oneTime: data.oneTime || false,
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return { success: false, message: "Server timeout — check internet connection" };
    }
    return { success: false, message: "Cannot reach activation server. Check your internet connection." };
  }
}

async function activate(key) {
  const machineId = getMachineId();
  const result = await validateOnline(key, machineId);

  if (!result.success) return result;

  saveActivation({
    isPro: true,
    activationKey: key.trim().toUpperCase(),
    machineId,
    token: result.token,
  });

  cacheLicenseMeta(result);

  return {
    success: true,
    message: result.message || "Pro mode activated!",
    isPro: true,
    expiresAt: result.expiresAt || null,
    planName: result.planName || null,
    maxDevices: result.maxDevices || null,
  };
}

async function verifyActivation() {
  const activation = getActivation();
  if (!activation?.is_pro) return { isPro: false };

  // Local expiry check first
  if (isLicenseExpiredLocally()) {
    clearActivation();
    return { isPro: false, message: "License expired" };
  }

  const machineId = getMachineId();
  if (activation.machine_id !== machineId) {
    clearActivation();
    return { isPro: false, message: "Machine mismatch — activation revoked" };
  }

  const server = getServerUrl();
  try {
    const res = await fetch(`${server}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: activation.activation_key,
        machineId,
        token: activation.token,
      }),
    });

    if (!res.ok) {
      clearActivation();
      return { isPro: false, message: "Activation expired or invalid" };
    }

    const data = await res.json();
    if (data.valid) {
      saveActivation({
        isPro: true,
        activationKey: activation.activation_key,
        machineId,
        token: data.token || activation.token,
      });
      cacheLicenseMeta(data);
      return {
        isPro: true,
        expiresAt: data.expiresAt || null,
        planName: data.planName || null,
        maxDevices: data.maxDevices || null,
      };
    }

    clearActivation();
    return { isPro: false, message: "Activation no longer valid" };
  } catch {
    // Offline — allow cached pro for 7 days if not expired by license date
    if (isLicenseExpiredLocally()) {
      clearActivation();
      return { isPro: false, message: "License expired" };
    }
    const lastVerified = activation.last_verified
      ? new Date(activation.last_verified)
      : null;
    if (lastVerified) {
      const daysSince = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return { isPro: true, offline: true, ...getCachedLicenseMeta() };
    }
    return { isPro: activation.is_pro === 1, offline: true, ...getCachedLicenseMeta() };
  }
}

function getCachedLicenseMeta() {
  const { getSetting } = require("./db");
  const expiresAt = getSetting("license_expires_at", "") || null;
  const planName = getSetting("license_plan_name", "") || null;
  const planCode = getSetting("license_plan_code", "") || null;
  const maxDevicesRaw = getSetting("license_max_devices", "");
  const maxDevices = maxDevicesRaw ? parseInt(maxDevicesRaw, 10) : null;
  return {
    expiresAt: expiresAt || null,
    planName,
    planCode,
    maxDevices: Number.isFinite(maxDevices) ? maxDevices : null,
  };
}

function getProStatus() {
  const activation = getActivation();
  const isPro = activation?.is_pro === 1 && !isLicenseExpiredLocally();
  if (activation?.is_pro === 1 && !isPro) {
    clearActivation();
  }
  const meta = getCachedLicenseMeta();
  return {
    isPro,
    activatedAt: activation?.activated_at,
    key: activation?.activation_key
      ? activation.activation_key.replace(/(.{4})(?=.{4})/g, "$1-").slice(0, 19) + "****"
      : null,
    ...meta,
  };
}

function isProActive() {
  return getProStatus().isPro;
}

function canSaveSnippet(currentCount) {
  if (isProActive()) return { allowed: true };
  if (currentCount >= FREE_SNIPPET_LIMIT) {
    return {
      allowed: false,
      message: `Free plan: max ${FREE_SNIPPET_LIMIT} snippets. Activate Pro to unlock unlimited.`,
    };
  }
  return { allowed: true };
}

function canExport() {
  if (isProActive()) return { allowed: true };
  return {
    allowed: false,
    message: "Export is a Pro feature. Activate Pro to export files.",
  };
}

function canUseVersionHistory() {
  if (isProActive()) return { allowed: true };
  return {
    allowed: false,
    message: "Version history is Pro only. Activate Pro to restore snapshots.",
  };
}

module.exports = {
  activate,
  verifyActivation,
  getProStatus,
  isProActive,
  canSaveSnippet,
  canExport,
  canUseVersionHistory,
  getMachineId,
  getServerUrl,
  ensureProductionServer,
  DEFAULT_SERVER,
  FREE_SNIPPET_LIMIT,
};
