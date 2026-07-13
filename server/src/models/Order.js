const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'PricingPlan', required: true },
    planCode: String,
    planName: String,
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentMethod: { type: String, default: 'demo' }, // demo | razorpay | manual
    paymentRef: { type: String, default: null },
    licenseKey: { type: String, default: null },
    licenseKeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'LicenseKey', default: null },
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
