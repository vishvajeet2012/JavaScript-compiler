const crypto = require('crypto');
const PricingPlan = require('../models/PricingPlan');
const LicenseKey = require('../models/LicenseKey');
const ApiError = require('../utils/ApiError');
const config = require('../config');

function randomSegment(len = 4) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/** Format: XXXX-XXXX-XXXX-XXXX */
function generateKeyCode(prefix) {
  const p = (prefix || 'JSCP').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  return `${p}-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
}

function generateToken(key, machineId) {
  return crypto
    .createHmac('sha256', config.activationSecret)
    .update(`${key}:${machineId}`)
    .digest('hex');
}

function computeExpiresAt(plan, customExpiresAt) {
  if (customExpiresAt) return new Date(customExpiresAt);
  if (!plan.durationDays || plan.durationDays <= 0) return null; // lifetime
  const d = new Date();
  d.setDate(d.getDate() + plan.durationDays);
  return d;
}

// ── Pricing ──────────────────────────────────────────────

async function listPlans() {
  return PricingPlan.find().sort({ sortOrder: 1, price: 1 }).lean();
}

async function createPlan(body) {
  const code = String(body.code || body.name || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (!body.name || !code) throw ApiError.badRequest('name and code are required');

  const existing = await PricingPlan.findOne({ code });
  if (existing) throw ApiError.badRequest(`Plan code already exists: ${code}`);

  const planType = ['standard', 'student', 'trial', 'team'].includes(body.planType)
    ? body.planType
    : 'standard';
  const maxDevices = Math.max(1, Number(body.maxDevices) || Number(body.seats) || 1);

  return PricingPlan.create({
    name: body.name.trim(),
    code,
    price: Number(body.price) || 0,
    originalPrice:
      body.originalPrice != null && body.originalPrice !== ''
        ? Number(body.originalPrice)
        : null,
    currency: (body.currency || 'INR').toUpperCase(),
    durationDays: body.durationDays == null ? 30 : Number(body.durationDays),
    maxDevices,
    oneTime: Boolean(body.oneTime),
    planType,
    requiresStudentId:
      body.requiresStudentId != null
        ? Boolean(body.requiresStudentId)
        : planType === 'student',
    seats: Math.max(1, Number(body.seats) || maxDevices),
    description: body.description || '',
    features: Array.isArray(body.features) ? body.features : [],
    active: body.active !== false,
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 100,
  });
}

async function updatePlan(id, body) {
  const plan = await PricingPlan.findById(id);
  if (!plan) throw ApiError.notFound('Plan not found');

  const fields = [
    'name',
    'price',
    'originalPrice',
    'currency',
    'durationDays',
    'maxDevices',
    'oneTime',
    'planType',
    'requiresStudentId',
    'seats',
    'description',
    'features',
    'active',
    'sortOrder',
  ];
  fields.forEach((f) => {
    if (body[f] !== undefined) plan[f] = body[f];
  });
  if (body.maxDevices !== undefined) plan.maxDevices = Math.max(1, Number(body.maxDevices));
  if (body.seats !== undefined) plan.seats = Math.max(1, Number(body.seats));
  if (body.originalPrice === '' || body.originalPrice === null) plan.originalPrice = null;
  if (plan.planType === 'student' && body.requiresStudentId === undefined) {
    plan.requiresStudentId = true;
  }
  await plan.save();
  return plan;
}

async function deletePlan(id) {
  const plan = await PricingPlan.findByIdAndDelete(id);
  if (!plan) throw ApiError.notFound('Plan not found');
  return { deleted: true };
}

// ── Keys ─────────────────────────────────────────────────

async function generateKeys(body) {
  const plan = await PricingPlan.findById(body.planId);
  if (!plan) throw ApiError.notFound('Pricing plan not found');
  if (!plan.active) throw ApiError.badRequest('Plan is inactive');

  // Team/coaching batch: up to 200 seat keys at once
  const maxCount = plan.planType === 'team' || body.batchName ? 200 : 100;
  const count = Math.min(Math.max(Number(body.count) || 1, 1), maxCount);
  const maxDevices =
    body.maxDevices != null ? Math.max(1, Number(body.maxDevices)) : plan.maxDevices;
  const oneTime = body.oneTime != null ? Boolean(body.oneTime) : plan.oneTime;
  const expiresAt = computeExpiresAt(plan, body.expiresAt);
  const batchName = String(body.batchName || '').trim();
  const batchId = batchName
    ? `BATCH-${Date.now().toString(36).toUpperCase()}`
    : String(body.batchId || '').trim() || null;
  const noteBase = body.note || '';
  const prefix = body.prefix || plan.code.slice(0, 4);

  const created = [];
  for (let i = 0; i < count; i += 1) {
    let key;
    let attempts = 0;
    // ensure unique
    // eslint-disable-next-line no-constant-condition
    while (true) {
      key = generateKeyCode(prefix);
      // eslint-disable-next-line no-await-in-loop
      const exists = await LicenseKey.exists({ key });
      if (!exists) break;
      attempts += 1;
      if (attempts > 20) throw ApiError.internal('Failed to generate unique key');
    }

    const seatLabel = count > 1 ? `seat ${i + 1}/${count}` : null;
    const note = [noteBase, batchId ? `batchId:${batchId}` : null, batchName ? `batch:${batchName}` : null, seatLabel]
      .filter(Boolean)
      .join(' · ');

    // eslint-disable-next-line no-await-in-loop
    const doc = await LicenseKey.create({
      key,
      plan: plan._id,
      planCode: plan.code,
      planName: plan.name,
      price: plan.price,
      currency: plan.currency,
      maxDevices,
      oneTime,
      expiresAt,
      note,
      status: 'active',
      devices: [],
    });
    created.push(doc);
  }

  return created;
}

async function listKeys(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.planId) filter.plan = query.planId;
  if (query.q) {
    filter.$or = [
      { key: new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { planName: new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { note: new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
  }

  const keys = await LicenseKey.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  const now = Date.now();
  return keys.map((k) => ({
    ...k,
    isExpired: k.expiresAt ? new Date(k.expiresAt).getTime() < now : false,
    devicesUsed: k.devices?.length || 0,
  }));
}

async function getKey(id) {
  const key = await LicenseKey.findById(id).populate('plan').lean();
  if (!key) throw ApiError.notFound('Key not found');
  return key;
}

async function revokeKey(id) {
  const key = await LicenseKey.findById(id);
  if (!key) throw ApiError.notFound('Key not found');
  key.status = 'revoked';
  await key.save();
  return key;
}

/**
 * Bulk revoke — by ids, key codes, note (order/refund), or planId
 */
async function revokeKeysBulk(body = {}) {
  const filter = {};

  if (Array.isArray(body.ids) && body.ids.length) {
    filter._id = { $in: body.ids };
  } else if (Array.isArray(body.keys) && body.keys.length) {
    filter.key = {
      $in: body.keys.map((k) => String(k).trim().toUpperCase()).filter(Boolean),
    };
  } else if (body.note) {
    filter.note = new RegExp(String(body.note).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  } else if (body.planId) {
    filter.plan = body.planId;
  } else {
    throw ApiError.badRequest('Provide ids, keys, note, or planId for bulk revoke');
  }

  if (!body.includeAlreadyRevoked) {
    filter.status = { $ne: 'revoked' };
  }

  const reason = body.reason || 'bulk_revoke';
  const docs = await LicenseKey.find(filter);
  let revoked = 0;

  for (const doc of docs) {
    doc.status = 'revoked';
    const tag = `[REVOKED:${reason}]`;
    if (!String(doc.note || '').includes(tag)) {
      doc.note = `${doc.note || ''} ${tag}`.trim();
    }
    // eslint-disable-next-line no-await-in-loop
    await doc.save();
    revoked += 1;
  }

  return { revoked, matched: docs.length, reason };
}

async function deleteKey(id) {
  const key = await LicenseKey.findByIdAndDelete(id);
  if (!key) throw ApiError.notFound('Key not found');
  return { deleted: true };
}

async function getStats() {
  const [plans, totalKeys, activeKeys, revokedKeys, expiredKeys, activations] = await Promise.all([
    PricingPlan.countDocuments(),
    LicenseKey.countDocuments(),
    LicenseKey.countDocuments({ status: 'active' }),
    LicenseKey.countDocuments({ status: 'revoked' }),
    LicenseKey.countDocuments({ status: 'expired' }),
    LicenseKey.aggregate([
      { $project: { n: { $size: '$devices' } } },
      { $group: { _id: null, total: { $sum: '$n' } } },
    ]),
  ]);

  return {
    plans,
    totalKeys,
    activeKeys,
    revokedKeys,
    expiredKeys,
    totalDeviceActivations: activations[0]?.total || 0,
  };
}

// ── Activation (Electron app) ────────────────────────────

/** Alphanumeric only — UI may re-insert hyphens in wrong places */
function compactKey(key) {
  return String(key || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Find license by exact key or hyphen-insensitive match
 * (e.g. PROMO-XXXX-… vs PROM-OXXX-… reformatted in UI).
 */
async function findLicenseByKey(rawKey) {
  const normalizedKey = String(rawKey || '')
    .trim()
    .toUpperCase();
  if (!normalizedKey) return null;

  let license = await LicenseKey.findOne({ key: normalizedKey });
  if (license) return license;

  const compact = compactKey(normalizedKey);
  if (!compact) return null;

  // Hyphen-insensitive match (Mongo $replaceAll)
  license = await LicenseKey.findOne({
    $expr: {
      $eq: [
        {
          $replaceAll: {
            input: { $toUpper: '$key' },
            find: '-',
            replacement: '',
          },
        },
        compact,
      ],
    },
  });
  return license;
}

async function activateKey({ key, machineId }) {
  const normalizedKey = String(key || '')
    .trim()
    .toUpperCase();
  if (!normalizedKey) throw ApiError.badRequest('Activation key required');
  if (!machineId) throw ApiError.badRequest('Machine ID required');

  const license = await findLicenseByKey(normalizedKey);
  if (!license) throw ApiError.forbidden('Invalid activation key');

  if (license.status === 'revoked') {
    throw ApiError.forbidden('This key has been revoked');
  }

  if (license.isExpired()) {
    license.status = 'expired';
    await license.save();
    throw ApiError.forbidden('This key has expired');
  }

  const already = license.devices.find((d) => d.machineId === machineId);
  // Always use canonical DB key for tokens / storage
  const canonicalKey = license.key;

  if (already) {
    already.lastVerifiedAt = new Date();
    await license.save();
    const token = generateToken(canonicalKey, machineId);
    return {
      valid: true,
      token,
      message: 'Pro mode activated successfully!',
      key: canonicalKey,
      expiresAt: license.expiresAt,
      maxDevices: license.maxDevices,
      devicesUsed: license.devices.length,
      planName: license.planName,
      planCode: license.planCode,
      oneTime: Boolean(license.oneTime),
    };
  }

  // One-time: only first device ever
  if (license.oneTime && license.devices.length >= 1) {
    throw ApiError.forbidden('This is a one-time key and is already used on another device');
  }

  if (license.devices.length >= license.maxDevices) {
    throw ApiError.forbidden(
      `Device limit reached (${license.maxDevices}). This key is already activated on ${license.devices.length} device(s).`
    );
  }

  license.devices.push({
    machineId,
    activatedAt: new Date(),
    lastVerifiedAt: new Date(),
  });
  license.activatedCount = license.devices.length;
  license.status = 'active';
  await license.save();

  const token = generateToken(canonicalKey, machineId);
  return {
    valid: true,
    token,
    message: 'Pro mode activated successfully!',
    key: canonicalKey,
    expiresAt: license.expiresAt,
    maxDevices: license.maxDevices,
    devicesUsed: license.devices.length,
    planName: license.planName,
    planCode: license.planCode,
    oneTime: Boolean(license.oneTime),
  };
}

async function verifyKey({ key, machineId, token }) {
  const normalizedKey = String(key || '')
    .trim()
    .toUpperCase();
  if (!normalizedKey || !machineId) {
    throw ApiError.badRequest('key and machineId required');
  }

  const license = await findLicenseByKey(normalizedKey);
  if (!license) throw ApiError.forbidden('Invalid key');

  if (license.status === 'revoked') {
    throw ApiError.forbidden('Key revoked');
  }

  if (license.isExpired()) {
    license.status = 'expired';
    await license.save();
    throw ApiError.forbidden('Key expired');
  }

  const canonicalKey = license.key;
  const expected = generateToken(canonicalKey, machineId);
  if (token !== expected) {
    throw ApiError.forbidden('Invalid token');
  }

  const device = license.devices.find((d) => d.machineId === machineId);
  if (!device) {
    throw ApiError.forbidden('Not activated on this device');
  }

  device.lastVerifiedAt = new Date();
  await license.save();

  return {
    valid: true,
    token: expected,
    expiresAt: license.expiresAt,
    maxDevices: license.maxDevices,
    devicesUsed: license.devices.length,
    planName: license.planName,
    planCode: license.planCode,
    oneTime: Boolean(license.oneTime),
  };
}

const DEFAULT_PLANS = [
  {
    name: '7-Day Trial',
    code: 'TRIAL_7D',
    price: 0,
    currency: 'INR',
    durationDays: 7,
    maxDevices: 1,
    oneTime: true,
    planType: 'trial',
    requiresStudentId: false,
    seats: 1,
    sortOrder: 10,
    description: 'Free 7-day trial key — full Pro on 1 device (one-time use)',
    features: [
      '7 days full Pro',
      'Unlimited snippets',
      'Export + version history',
      'TS / HTML+JS / Node',
      '1 device · one-time key',
    ],
  },
  {
    name: 'Pro Monthly',
    code: 'PRO_MONTHLY',
    price: 149,
    currency: 'INR',
    durationDays: 30,
    maxDevices: 1,
    oneTime: false,
    planType: 'standard',
    seats: 1,
    sortOrder: 20,
    description: 'Full Pro for 30 days, 1 device',
    features: [
      'Unlimited snippets',
      'Export projects',
      'Version history',
      'TS / HTML+JS / Node',
      '1 device · 30 days',
    ],
  },
  {
    name: 'Pro Yearly',
    code: 'PRO_YEARLY',
    price: 799,
    currency: 'INR',
    durationDays: 365,
    maxDevices: 2,
    oneTime: false,
    planType: 'standard',
    seats: 2,
    sortOrder: 30,
    description: 'Full Pro for 1 year, up to 2 devices — best value',
    features: [
      'Unlimited snippets',
      'Export + version history',
      'Multi-language support',
      '2 devices · 1 year',
    ],
  },
  {
    name: 'Student Yearly',
    code: 'STUDENT_YEARLY',
    price: 399,
    originalPrice: 799,
    currency: 'INR',
    durationDays: 365,
    maxDevices: 1,
    oneTime: false,
    planType: 'student',
    requiresStudentId: true,
    seats: 1,
    sortOrder: 40,
    description: '50% student discount — verify with college / student ID',
    features: [
      'Student discount (~50% off)',
      'Full Pro for 1 year',
      'College / student ID required',
      '1 device',
    ],
  },
  {
    name: 'Lifetime',
    code: 'LIFETIME',
    price: 1999,
    currency: 'INR',
    durationDays: 0,
    maxDevices: 3,
    oneTime: false,
    planType: 'standard',
    seats: 3,
    sortOrder: 50,
    description: 'Pay once — Lifetime Pro, up to 3 devices',
    features: [
      'Lifetime Pro',
      'Unlimited snippets',
      'Export + version history',
      '3 devices',
    ],
  },
  {
    name: 'Team / Batch (25 seats)',
    code: 'TEAM_25',
    price: 4999,
    currency: 'INR',
    durationDays: 365,
    maxDevices: 25,
    oneTime: false,
    planType: 'team',
    requiresStudentId: false,
    seats: 25,
    sortOrder: 60,
    description: 'Coaching class license — 25 devices for 1 year (single master key)',
    features: [
      '25 device seats',
      'Ideal for coaching batches',
      '1 year validity',
      'Full Pro for every seat',
    ],
  },
  {
    name: 'One-Time Trial (paid)',
    code: 'ONETIME',
    price: 49,
    currency: 'INR',
    durationDays: 7,
    maxDevices: 1,
    oneTime: true,
    planType: 'trial',
    seats: 1,
    sortOrder: 15,
    description: '₹49 · 7-day single-use trial key, 1 device',
    features: ['7 days', '1 device', 'One-time use'],
  },
];

/**
 * Upsert all default plans by code (safe to re-run).
 * Adds missing plans; does not overwrite price if plan already customized
 * unless force=true.
 */
async function seedDefaultPlans(options = {}) {
  const force = Boolean(options.force);
  let inserted = 0;
  let updated = 0;

  for (const def of DEFAULT_PLANS) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await PricingPlan.findOne({ code: def.code });
    if (!existing) {
      // eslint-disable-next-line no-await-in-loop
      await PricingPlan.create(def);
      inserted += 1;
    } else if (force) {
      Object.assign(existing, def);
      // eslint-disable-next-line no-await-in-loop
      await existing.save();
      updated += 1;
    } else {
      // ensure new metadata fields exist without wiping custom prices
      let dirty = false;
      if (!existing.planType && def.planType) {
        existing.planType = def.planType;
        dirty = true;
      }
      if (existing.requiresStudentId == null && def.requiresStudentId != null) {
        existing.requiresStudentId = def.requiresStudentId;
        dirty = true;
      }
      if (!existing.seats && def.seats) {
        existing.seats = def.seats;
        dirty = true;
      }
      if (existing.sortOrder == null && def.sortOrder != null) {
        existing.sortOrder = def.sortOrder;
        dirty = true;
      }
      if (dirty) {
        // eslint-disable-next-line no-await-in-loop
        await existing.save();
        updated += 1;
      }
    }
  }

  return {
    seeded: inserted > 0 || updated > 0,
    inserted,
    updated,
    total: DEFAULT_PLANS.length,
  };
}

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  generateKeys,
  listKeys,
  getKey,
  revokeKey,
  revokeKeysBulk,
  deleteKey,
  getStats,
  activateKey,
  verifyKey,
  seedDefaultPlans,
  generateToken,
};
