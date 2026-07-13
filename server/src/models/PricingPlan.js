const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    /** null / 0 = lifetime (no expiry from plan) */
    durationDays: { type: Number, default: 30, min: 0 },
    maxDevices: { type: Number, default: 1, min: 1 },
    /** one-time purchase key: typically 1 activation window, not renewable */
    oneTime: { type: Boolean, default: false },
    description: { type: String, default: '' },
    features: [{ type: String }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PricingPlan', pricingPlanSchema);
