const mongoose = require('mongoose');

/**
 * Website free-key promo (Next.js popup for N days/months).
 * Keys themselves live in LicenseKey collection; this holds campaign + key list for display.
 */
const promoOfferSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    /** Keys shown publicly on the website popup (one per visitor claim / rotate) */
    keys: [{ type: String, uppercase: true, trim: true }],
    /** License validity shown to users */
    keyExpiresAt: { type: Date, required: true },
    /** Popup visible on site until this date (e.g. 2 months) */
    showUntil: { type: Date, required: true },
    active: { type: Boolean, default: true, index: true },
    maxClaimsPerKey: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('PromoOffer', promoOfferSchema);
