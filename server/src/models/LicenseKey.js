const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    machineId: { type: String, required: true },
    activatedAt: { type: Date, default: Date.now },
    lastVerifiedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const licenseKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PricingPlan',
      required: true,
    },
    planCode: { type: String, required: true, uppercase: true },
    planName: { type: String, required: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    maxDevices: { type: Number, default: 1, min: 1 },
    /** If true: after first successful activation on a device, no new devices ever (even if maxDevices>1 usually 1) */
    oneTime: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    note: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired', 'exhausted'],
      default: 'active',
      index: true,
    },
    devices: [deviceSchema],
    activatedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

licenseKeySchema.methods.isExpired = function isExpired() {
  if (!this.expiresAt) return false;
  return new Date() > new Date(this.expiresAt);
};

licenseKeySchema.methods.refreshStatus = function refreshStatus() {
  if (this.status === 'revoked') return this.status;
  if (this.isExpired()) {
    this.status = 'expired';
    return this.status;
  }
  if (this.oneTime && this.devices.length >= 1 && this.devices.length >= this.maxDevices) {
    // still active for existing devices; exhausted only if trying new ones
  }
  if (this.status === 'expired') this.status = 'active';
  return this.status;
};

module.exports = mongoose.model('LicenseKey', licenseKeySchema);
