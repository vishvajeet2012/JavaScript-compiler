const { machineIdSync } = require("node-machine-id");
const crypto = require("crypto");
const { getActivation, saveActivation, clearActivation } = require("./db");

// Main Express server (MongoDB-backed activation + admin keys)
const DEFAULT_SERVER = "http://localhost:5000";
const FREE_SNIPPET_LIMIT = 5;

function getMachineId() {
  return crypto.createHash("sha256").update(machineIdSync(true)).digest("hex").slice(0, 32);
}

function getServerUrl() {
  const { getSetting } = require("./db");
  return getSetting("activation_server", DEFAULT_SERVER);
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
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return { success: false, message: "Server timeout — check internet connection" };
    }
    return { success: false, message: "Cannot reach activation server. Is it running?" };
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

  // Cache expiry for offline license enforcement
  const { setSetting } = require("./db");
  if (result.expiresAt) setSetting("license_expires_at", String(result.expiresAt));
  else setSetting("license_expires_at", "");

  return {
    success: true,
    message: "Pro mode activated!",
    isPro: true,
    expiresAt: result.expiresAt || null,
  };
}

async function verifyActivation() {
  const activation = getActivation();
  if (!activation?.is_pro) return { isPro: false };

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
      const { setSetting } = require("./db");
      if (data.expiresAt) setSetting("license_expires_at", String(data.expiresAt));
      return { isPro: true, expiresAt: data.expiresAt || null };
    }

    clearActivation();
    return { isPro: false, message: "Activation no longer valid" };
  } catch {
    // Offline — allow cached pro for 7 days
    const lastVerified = activation.last_verified
      ? new Date(activation.last_verified)
      : null;
    if (lastVerified) {
      const daysSince = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return { isPro: true, offline: true };
    }
    return { isPro: activation.is_pro === 1, offline: true };
  }
}

function getProStatus() {
  const activation = getActivation();
  return {
    isPro: activation?.is_pro === 1,
    activatedAt: activation?.activated_at,
    key: activation?.activation_key
      ? activation.activation_key.replace(/(.{4})(?=.{4})/g, "$1-").slice(0, 19) + "****"
      : null,
  };
}

function canSaveSnippet(currentCount) {
  const activation = getActivation();
  if (activation?.is_pro === 1) return { allowed: true };
  if (currentCount >= FREE_SNIPPET_LIMIT) {
    return {
      allowed: false,
      message: `Free plan: max ${FREE_SNIPPET_LIMIT} snippets. Activate Pro to unlock unlimited.`,
    };
  }
  return { allowed: true };
}

module.exports = {
  activate,
  verifyActivation,
  getProStatus,
  canSaveSnippet,
  getMachineId,
  FREE_SNIPPET_LIMIT,
};