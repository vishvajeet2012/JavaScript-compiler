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
    /** Shown as strike-through when student/discount plan */
    originalPrice: { type: Number, default: null },
    currency: { type: String, default: 'INR', uppercase: true },
    /** null / 0 = lifetime (no expiry from plan) */
    durationDays: { type: Number, default: 30, min: 0 },
    maxDevices: { type: Number, default: 1, min: 1 },
    /** one-time purchase key: single activation window */
    oneTime: { type: Boolean, default: false },
    /**
     * standard | student | trial | team
     * student → requires student ID on purchase
     * trial   → short 7-day key
     * team    → coaching/batch multi-seat license
     */
    planType: {
      type: String,
      enum: ['standard', 'student', 'trial', 'team'],
      default: 'standard',
      index: true,
    },
    /** Student plans: buyer must submit college student ID */
    requiresStudentId: { type: Boolean, default: false },
    /** Team plans: advertised seat count (maps to maxDevices by default) */
    seats: { type: Number, default: 1, min: 1 },
    description: { type: String, default: '' },
    features: [{ type: String }],
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PricingPlan', pricingPlanSchema);
