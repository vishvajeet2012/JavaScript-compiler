const mongoose = require('mongoose');

/**
 * One promo key claim per visitor (visitorId cookie/localStorage).
 * Also tracks which keys have been handed out (rotate pool).
 */
const promoClaimSchema = new mongoose.Schema(
  {
    offerCode: { type: String, required: true, uppercase: true, index: true },
    visitorId: { type: String, required: true, index: true },
    key: { type: String, required: true, uppercase: true },
    ipHash: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

promoClaimSchema.index({ offerCode: 1, visitorId: 1 }, { unique: true });
promoClaimSchema.index({ offerCode: 1, key: 1 });

module.exports = mongoose.model('PromoClaim', promoClaimSchema);
