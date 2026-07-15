const PromoOffer = require('../models/PromoOffer');
const ApiError = require('../utils/ApiError');

async function listAll() {
  return PromoOffer.find().sort({ createdAt: -1 }).lean();
}

/** Public: active promo for Next.js popup (within showUntil) */
async function getActivePublic() {
  const now = new Date();
  const row = await PromoOffer.findOne({
    active: true,
    showUntil: { $gte: now },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!row) return null;

  return {
    code: row.code,
    title: row.title,
    message: row.message,
    /** Full list for admin; public may rotate single key */
    keys: row.keys || [],
    keyExpiresAt: row.keyExpiresAt,
    showUntil: row.showUntil,
    /** Pick first key for simple “copy free key” UX */
    sampleKey: (row.keys && row.keys[0]) || null,
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

module.exports = { listAll, getActivePublic, create, update, remove };
