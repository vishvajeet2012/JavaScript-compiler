const Announcement = require('../models/Announcement');
const ApiError = require('../utils/ApiError');

async function listAll() {
  return Announcement.find().sort({ priority: -1, createdAt: -1 }).lean();
}

/** Public: one active message for desktop app */
async function getActive() {
  const now = new Date();
  const row = await Announcement.findOne({
    active: true,
    startsAt: { $lte: now },
    $or: [{ endsAt: null }, { endsAt: { $gte: now } }],
  })
    .sort({ priority: -1, createdAt: -1 })
    .lean();
  return row;
}

async function create(body = {}) {
  if (!body.title || !body.body) {
    throw ApiError.badRequest('title and body are required');
  }
  return Announcement.create({
    title: String(body.title).trim(),
    body: String(body.body).trim(),
    type: body.type || 'info',
    active: body.active !== false,
    priority: Number(body.priority) || 10,
    startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
    ctaLabel: body.ctaLabel || '',
    ctaUrl: body.ctaUrl || '',
  });
}

async function update(id, body = {}) {
  const row = await Announcement.findById(id);
  if (!row) throw ApiError.notFound('Announcement not found');
  const fields = [
    'title',
    'body',
    'type',
    'active',
    'priority',
    'startsAt',
    'endsAt',
    'ctaLabel',
    'ctaUrl',
  ];
  for (const f of fields) {
    if (body[f] !== undefined) {
      if (f === 'startsAt' || f === 'endsAt') {
        row[f] = body[f] ? new Date(body[f]) : null;
      } else if (f === 'active') {
        row[f] = Boolean(body[f]);
      } else if (f === 'priority') {
        row[f] = Number(body[f]) || 0;
      } else {
        row[f] = body[f];
      }
    }
  }
  await row.save();
  return row.toObject();
}

async function remove(id) {
  const row = await Announcement.findByIdAndDelete(id);
  if (!row) throw ApiError.notFound('Announcement not found');
  return { deleted: true };
}

module.exports = { listAll, getActive, create, update, remove };
