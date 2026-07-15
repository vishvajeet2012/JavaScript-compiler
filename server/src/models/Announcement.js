const mongoose = require('mongoose');

/**
 * Admin → desktop app broadcast message (shown as banner/popup in Electron).
 */
const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['info', 'promo', 'warning', 'success'],
      default: 'info',
    },
    active: { type: Boolean, default: true, index: true },
    /** Soft priority — higher shows first */
    priority: { type: Number, default: 10 },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, default: null },
    /** Optional deep-link / CTA */
    ctaLabel: { type: String, default: '' },
    ctaUrl: { type: String, default: '' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Announcement', announcementSchema);
