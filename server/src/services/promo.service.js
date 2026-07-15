const crypto = require('crypto');
const PromoOffer = require('../models/PromoOffer');
const PromoClaim = require('../models/PromoClaim');
const ApiError = require('../utils/ApiError');

async function listAll() {
  return PromoOffer.find().sort({ createdAt: -1 }).lean();
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip || '')).digest('hex').slice(0, 24);
}

/** Public metadata only — no full key list (claim endpoint hands out keys). */
async function getActivePublic() {
  const now = new Date();
  const row = await PromoOffer.findOne({
    active: true,
    showUntil: { $gte: now },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!row) return null;

  const total = (row.keys || []).length;
  const claimed = await PromoClaim.countDocuments({ offerCode: row.code });
  const remaining = Math.max(0, total - claimed);

  return {
    code: row.code,
    title: row.title,
    message: row.message,
    keyExpiresAt: row.keyExpiresAt,
    showUntil: row.showUntil,
    keysRemaining: remaining,
    keysTotal: total,
    /** Claim required — do not expose pool */
    claimRequired: true,
    sampleKey: null,
    keys: [],
  };
}

/**
 * Claim one key for this visitor. Same visitor always gets the same key.
 * New visitors get the next unused key (rotation).
 */
async function claimKey({ offerCode, visitorId, ip, userAgent } = {}) {
  const now = new Date();
  if (!visitorId || String(visitorId).length < 8) {
    throw ApiError.badRequest('visitorId required');
  }

  const offer = offerCode
    ? await PromoOffer.findOne({ code: String(offerCode).toUpperCase(), active: true })
    : await PromoOffer.findOne({ active: true, showUntil: { $gte: now } }).sort({
        createdAt: -1,
      });

  if (!offer || new Date(offer.showUntil) < now) {
    throw ApiError.badRequest('No active promo campaign');
  }

  const code = offer.code;
  const vid = String(visitorId).slice(0, 128);

  // Already claimed?
  const existing = await PromoClaim.findOne({ offerCode: code, visitorId: vid }).lean();
  if (existing) {
    return {
      key: existing.key,
      alreadyClaimed: true,
      offerCode: code,
      keyExpiresAt: offer.keyExpiresAt,
      title: offer.title,
      message: offer.message,
    };
  }

  const used = await PromoClaim.find({ offerCode: code }).distinct('key');
  const usedSet = new Set(used.map((k) => String(k).toUpperCase()));
  const pool = (offer.keys || []).map((k) => String(k).toUpperCase());
  const next = pool.find((k) => !usedSet.has(k));

  if (!next) {
    throw ApiError.badRequest('All promotional keys have been claimed');
  }

  // maxClaimsPerKey (default 1): if somehow duplicate key in claims, skip
  const maxPerKey = Math.max(1, Number(offer.maxClaimsPerKey) || 1);
  const keyUseCount = await PromoClaim.countDocuments({ offerCode: code, key: next });
  if (keyUseCount >= maxPerKey) {
    // try remaining pool
    const alt = pool.find((k) => !usedSet.has(k) && k !== next);
    if (!alt) throw ApiError.badRequest('All promotional keys have been claimed');
    return claimKeyAssign(offer, alt, vid, ip, userAgent);
  }

  return claimKeyAssign(offer, next, vid, ip, userAgent);
}

async function claimKeyAssign(offer, key, visitorId, ip, userAgent) {
  try {
    await PromoClaim.create({
      offerCode: offer.code,
      visitorId,
      key,
      ipHash: hashIp(ip),
      userAgent: String(userAgent || '').slice(0, 300),
    });
  } catch (err) {
    // race: unique visitor — re-read
    if (err?.code === 11000) {
      const again = await PromoClaim.findOne({
        offerCode: offer.code,
        visitorId,
      }).lean();
      if (again) {
        return {
          key: again.key,
          alreadyClaimed: true,
          offerCode: offer.code,
          keyExpiresAt: offer.keyExpiresAt,
          title: offer.title,
          message: offer.message,
        };
      }
    }
    throw err;
  }

  return {
    key,
    alreadyClaimed: false,
    offerCode: offer.code,
    keyExpiresAt: offer.keyExpiresAt,
    title: offer.title,
    message: offer.message,
  };
}

async function create(body = {}) {
  if (!body.code || !body.title) {
    throw ApiError.badRequest('code and title required');
  }
  if (!body.keyExpiresAt || !body.showUntil) {
    throw ApiError.badRequest('keyExpiresAt and showUntil required');
  }
  const keys = Array.isArray(body.keys)
    ? body.keys.map((k) => String(k).toUpperCase().trim()).filter(Boolean)
    : [];

  return PromoOffer.create({
    code: String(body.code).toUpperCase().trim(),
    title: body.title,
    message: body.message || '',
    keys,
    keyExpiresAt: new Date(body.keyExpiresAt),
    showUntil: new Date(body.showUntil),
    active: body.active !== false,
    maxClaimsPerKey: Math.max(1, Number(body.maxClaimsPerKey) || 1),
  });
}

async function update(id, body = {}) {
  const row = await PromoOffer.findById(id);
  if (!row) throw ApiError.notFound('Promo not found');
  if (body.title != null) row.title = body.title;
  if (body.message != null) row.message = body.message;
  if (body.active != null) row.active = Boolean(body.active);
  if (body.keyExpiresAt != null) row.keyExpiresAt = new Date(body.keyExpiresAt);
  if (body.showUntil != null) row.showUntil = new Date(body.showUntil);
  if (body.maxClaimsPerKey != null) {
    row.maxClaimsPerKey = Math.max(1, Number(body.maxClaimsPerKey) || 1);
  }
  if (Array.isArray(body.keys)) {
    row.keys = body.keys.map((k) => String(k).toUpperCase().trim()).filter(Boolean);
  }
  await row.save();
  return row.toObject();
}

async function remove(id) {
  const row = await PromoOffer.findByIdAndDelete(id);
  if (!row) throw ApiError.notFound('Promo not found');
  return { deleted: true };
}

async function claimStats(offerCode) {
  const code = String(offerCode || '').toUpperCase();
  const offer = await PromoOffer.findOne({ code }).lean();
  if (!offer) throw ApiError.notFound('Promo not found');
  const claimed = await PromoClaim.countDocuments({ offerCode: code });
  return {
    code,
    totalKeys: (offer.keys || []).length,
    claimed,
    remaining: Math.max(0, (offer.keys || []).length - claimed),
  };
}

module.exports = {
  listAll,
  getActivePublic,
  claimKey,
  create,
  update,
  remove,
  claimStats,
};
