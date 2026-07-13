const DeviceUsage = require('../models/DeviceUsage');
const LicenseKey = require('../models/LicenseKey');
const ApiError = require('../utils/ApiError');
/**
 * Global min version (optional) via env
 */
function globalMinVersion() {
  return process.env.MIN_APP_VERSION || null;
}

/**
 * Electron silent policy check — can force-quit or revoke pro
 */
async function checkPolicy(body = {}) {
  const machineId = String(body.machineId || '').trim();
  if (!machineId) throw ApiError.badRequest('machineId required');

  let device = await DeviceUsage.findOne({ machineId });
  if (!device) {
    device = await DeviceUsage.create({
      machineId,
      appVersion: body.appVersion,
      platform: body.platform,
      isPro: Boolean(body.isPro),
      activationKey: body.activationKey || null,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
  } else {
    device.lastSeenAt = new Date();
    if (body.appVersion) device.appVersion = body.appVersion;
    if (body.platform) device.platform = body.platform;
    if (body.isPro != null) device.isPro = Boolean(body.isPro);
    if (body.activationKey !== undefined) device.activationKey = body.activationKey || null;
    await device.save();
  }

  // License status if key present
  let licenseExpiresAt = null;
  let licenseValid = true;
  if (body.activationKey) {
    const license = await LicenseKey.findOne({
      key: String(body.activationKey).trim().toUpperCase(),
    });
    if (!license) {
      licenseValid = false;
    } else if (license.status === 'revoked' || license.isExpired()) {
      licenseValid = false;
      if (license.isExpired() && license.status !== 'revoked') {
        license.status = 'expired';
        await license.save();
      }
    } else {
      licenseExpiresAt = license.expiresAt || null;
      const onDevice = (license.devices || []).some((d) => d.machineId === machineId);
      if (!onDevice) licenseValid = false;
    }
  }

  const blocked = Boolean(device.blocked);
  const forceQuit = Boolean(device.forceQuit) || blocked;
  const revokePro = Boolean(device.revokePro) || !licenseValid;
  const minVersion = device.minVersion || globalMinVersion();

  return {
    allowed: !blocked && !forceQuit,
    blocked,
    forceQuit,
    revokePro: revokePro && Boolean(body.isPro || body.activationKey),
    reason:
      device.blockReason ||
      (!licenseValid && body.activationKey
        ? 'License invalid, expired, or revoked'
        : blocked
          ? 'Device blocked by administrator'
          : ''),
    minVersion,
    licenseExpiresAt,
    licenseValid,
    serverTime: new Date().toISOString(),
  };
}

async function setDeviceProtection(machineId, patch = {}) {
  const id = String(machineId || '').trim();
  if (!id) throw ApiError.badRequest('machineId required');

  let device = await DeviceUsage.findOne({ machineId: id });
  if (!device) {
    device = new DeviceUsage({ machineId: id, firstSeenAt: new Date() });
  }

  if (patch.blocked !== undefined) {
    device.blocked = Boolean(patch.blocked);
    device.blockedAt = device.blocked ? new Date() : null;
    if (device.blocked) device.forceQuit = true;
  }
  if (patch.forceQuit !== undefined) device.forceQuit = Boolean(patch.forceQuit);
  if (patch.revokePro !== undefined) device.revokePro = Boolean(patch.revokePro);
  if (patch.blockReason !== undefined) device.blockReason = String(patch.blockReason || '');
  if (patch.minVersion !== undefined) device.minVersion = patch.minVersion || null;

  // Unblock clears force quit unless explicitly set
  if (patch.blocked === false && patch.forceQuit === undefined) {
    device.forceQuit = false;
  }

  await device.save();
  return device.toObject();
}

module.exports = {
  checkPolicy,
  setDeviceProtection,
  globalMinVersion,
};
