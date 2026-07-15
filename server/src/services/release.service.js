const Release = require('../models/Release');
const ApiError = require('../utils/ApiError');
const r2 = require('./r2.service');

function normalizeVersion(v) {
  return String(v || '')
    .trim()
    .replace(/^v/i, '');
}

function mapPlatform(p = {}) {
  return {
    id: p.id || 'other',
    name: p.name || '',
    arch: p.arch || '',
    label: p.label || '',
    fileName: p.fileName || p.file || '',
    note: p.note || '',
    downloadUrl: p.downloadUrl || p.href || '',
    r2Key: p.r2Key || '',
    size: Number(p.size) || 0,
    sha512: p.sha512 || '',
  };
}

async function listAll(query = {}) {
  const filter = {};
  if (query.isHome === 'true' || query.isHome === true) filter.isHome = true;
  if (query.isOutdated === 'true' || query.isOutdated === true) filter.isOutdated = true;
  if (query.isOutdated === 'false' || query.isOutdated === false) filter.isOutdated = false;
  if (query.isPublished === 'false') filter.isPublished = false;
  else if (query.admin !== '1') filter.isPublished = true;

  return Release.find(filter).sort({ publishedAt: -1, createdAt: -1 }).lean();
}

/** Public: home download line(s) */
async function listHome() {
  const rows = await Release.find({
    isPublished: true,
    isHome: true,
    isOutdated: false,
  })
    .sort({ publishedAt: -1 })
    .lean();

  // Enrich with resolvable URLs (signed if needed)
  return Promise.all(rows.map((rel) => hydrateRelease(rel)));
}

/** Public: history / outdated releases */
async function listHistory() {
  const rows = await Release.find({
    isPublished: true,
    $or: [{ isOutdated: true }, { isHome: false }],
  })
    .sort({ publishedAt: -1 })
    .lean();
  return Promise.all(rows.map((rel) => hydrateRelease(rel)));
}

async function hydrateRelease(rel) {
  const platforms = await Promise.all(
    (rel.platforms || []).map(async (p) => {
      let downloadUrl = p.downloadUrl || '';
      try {
        if (!downloadUrl && p.r2Key) {
          downloadUrl = await r2.resolveDownloadUrl(p);
        }
      } catch {
        /* keep empty */
      }
      return {
        ...p,
        downloadUrl: downloadUrl || p.downloadUrl || '',
        href: downloadUrl || p.downloadUrl || '',
        file: p.fileName,
      };
    }),
  );
  return { ...rel, platforms, version: normalizeVersion(rel.version) };
}

async function getByVersion(version) {
  const v = normalizeVersion(version);
  const rel = await Release.findOne({
    version: { $in: [v, `v${v}`] },
    isPublished: true,
  }).lean();
  if (!rel) throw ApiError.notFound('Release not found');
  return hydrateRelease(rel);
}

async function getById(id) {
  const rel = await Release.findById(id).lean();
  if (!rel) throw ApiError.notFound('Release not found');
  return hydrateRelease(rel);
}

async function create(body = {}) {
  const version = normalizeVersion(body.version);
  if (!version) throw ApiError.badRequest('version is required');

  const existing = await Release.findOne({
    version: { $in: [version, `v${version}`] },
  });
  if (existing) throw ApiError.badRequest(`Release ${version} already exists`);

  const isHome = Boolean(body.isHome);
  if (isHome) {
    await Release.updateMany({ isHome: true }, { $set: { isHome: false } });
  }

  const doc = await Release.create({
    version,
    title: body.title || `JS Compiler v${version}`,
    notes: body.notes || '',
    isHome,
    isOutdated: Boolean(body.isOutdated),
    isPublished: body.isPublished !== false,
    platforms: (body.platforms || []).map(mapPlatform),
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
    changelog: Array.isArray(body.changelog) ? body.changelog : [],
  });

  return hydrateRelease(doc.toObject());
}

async function update(id, body = {}) {
  const rel = await Release.findById(id);
  if (!rel) throw ApiError.notFound('Release not found');

  if (body.version != null) {
    rel.version = normalizeVersion(body.version);
  }
  if (body.title != null) rel.title = body.title;
  if (body.notes != null) rel.notes = body.notes;
  if (body.changelog != null) rel.changelog = body.changelog;
  if (body.publishedAt != null) rel.publishedAt = new Date(body.publishedAt);
  if (body.isPublished != null) rel.isPublished = Boolean(body.isPublished);
  if (body.isOutdated != null) rel.isOutdated = Boolean(body.isOutdated);

  if (body.isHome != null) {
    const next = Boolean(body.isHome);
    if (next) {
      await Release.updateMany(
        { _id: { $ne: rel._id }, isHome: true },
        { $set: { isHome: false } },
      );
      // Promoting to home → not outdated
      rel.isOutdated = false;
    }
    rel.isHome = next;
  }

  if (Array.isArray(body.platforms)) {
    rel.platforms = body.platforms.map(mapPlatform);
  }

  await rel.save();
  return hydrateRelease(rel.toObject());
}

/**
 * Set / update a single platform (after R2 upload or URL paste).
 */
async function upsertPlatform(id, platformBody = {}) {
  const rel = await Release.findById(id);
  if (!rel) throw ApiError.notFound('Release not found');

  const p = mapPlatform(platformBody);
  if (!p.id) throw ApiError.badRequest('platform id is required');

  const idx = rel.platforms.findIndex((x) => x.id === p.id);
  if (idx >= 0) {
    rel.platforms[idx] = { ...rel.platforms[idx].toObject?.() || rel.platforms[idx], ...p };
  } else {
    rel.platforms.push(p);
  }
  await rel.save();
  return hydrateRelease(rel.toObject());
}

async function remove(id) {
  const rel = await Release.findByIdAndDelete(id);
  if (!rel) throw ApiError.notFound('Release not found');
  return { deleted: true, version: rel.version };
}

/**
 * Presign R2 PUT for a platform file, returns upload URL + key.
 */
async function presignUpload(id, { platformId, fileName, contentType } = {}) {
  const rel = await Release.findById(id);
  if (!rel) throw ApiError.notFound('Release not found');
  if (!platformId) throw ApiError.badRequest('platformId is required');
  if (!fileName) throw ApiError.badRequest('fileName is required');

  const key = r2.buildObjectKey({
    version: rel.version,
    platformId,
    fileName,
  });

  const signed = await r2.createPresignedPut({
    key,
    contentType: contentType || 'application/octet-stream',
    expiresIn: 3600,
  });

  return {
    ...signed,
    version: rel.version,
    platformId,
    fileName,
  };
}

/**
 * After browser finished PUT to R2, attach key + optional size to release.
 */
async function confirmR2Upload(id, body = {}) {
  const rel = await Release.findById(id);
  if (!rel) throw ApiError.notFound('Release not found');

  const platformId = body.platformId;
  const r2Key = body.r2Key || body.key;
  if (!platformId || !r2Key) {
    throw ApiError.badRequest('platformId and r2Key are required');
  }

  let size = Number(body.size) || 0;
  try {
    const head = await r2.headObject(r2Key);
    size = head.ContentLength || size;
  } catch {
    /* object may still be consistent eventually */
  }

  const c = r2.r2Config();
  let downloadUrl = body.downloadUrl || '';
  if (!downloadUrl && c.publicBase) {
    downloadUrl = `${c.publicBase}/${r2Key}`;
  }

  const platform = mapPlatform({
    id: platformId,
    name: body.name,
    arch: body.arch,
    label: body.label,
    fileName: body.fileName,
    note: body.note,
    downloadUrl,
    r2Key,
    size,
  });

  const idx = rel.platforms.findIndex((x) => x.id === platformId);
  if (idx >= 0) {
    const prev = rel.platforms[idx].toObject?.() || rel.platforms[idx];
    rel.platforms[idx] = { ...prev, ...platform };
  } else {
    rel.platforms.push(platform);
  }
  await rel.save();
  return hydrateRelease(rel.toObject());
}

/**
 * Resolve download URL for platform from home release, else any published.
 */
async function resolvePlatformDownload(platformId = 'windows') {
  const pid = String(platformId || 'windows').toLowerCase();

  let rel = await Release.findOne({
    isPublished: true,
    isHome: true,
    isOutdated: false,
    'platforms.id': pid === 'mac' ? { $in: ['mac-arm64', 'mac-x64', 'mac'] } : pid,
  })
    .sort({ publishedAt: -1 })
    .lean();

  if (!rel) {
    rel = await Release.findOne({
      isPublished: true,
      isOutdated: false,
      'platforms.id': pid === 'mac' ? { $in: ['mac-arm64', 'mac-x64', 'mac'] } : pid,
    })
      .sort({ publishedAt: -1 })
      .lean();
  }

  if (!rel) return null;

  const platforms = rel.platforms || [];
  let p =
    platforms.find((x) => x.id === pid) ||
    (pid === 'mac'
      ? platforms.find((x) => x.id === 'mac-arm64') ||
        platforms.find((x) => x.id === 'mac-x64')
      : null);

  if (!p) return null;

  const url = await r2.resolveDownloadUrl(p);
  return {
    url,
    version: rel.version,
    releaseId: String(rel._id),
    platform: p,
    source: p.r2Key ? 'r2' : 'url',
  };
}

module.exports = {
  normalizeVersion,
  listAll,
  listHome,
  listHistory,
  getByVersion,
  getById,
  create,
  update,
  upsertPlatform,
  remove,
  presignUpload,
  confirmR2Upload,
  resolvePlatformDownload,
};
