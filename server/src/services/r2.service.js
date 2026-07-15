/**
 * Cloudflare R2 (S3-compatible) helpers for admin release uploads.
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT,
 * optional R2_PUBLIC_BASE_URL for public CDN URLs.
 */

const { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID || '';
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  return {
    accountId,
    endpoint,
    bucket: process.env.R2_BUCKET_NAME || 'javascript',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    publicBase: (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
    signedGetTtl: Number(process.env.R2_SIGNED_URL_TTL || 3600),
  };
}

function isConfigured() {
  const c = r2Config();
  return Boolean(c.endpoint && c.accessKeyId && c.secretAccessKey && c.bucket);
}

let client;
function getClient() {
  if (!isConfigured()) {
    const err = new Error('R2 is not configured on the API server (set R2_* env vars)');
    err.statusCode = 503;
    throw err;
  }
  if (client) return client;
  const c = r2Config();
  client = new S3Client({
    region: 'auto',
    endpoint: c.endpoint,
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
    },
    forcePathStyle: true,
  });
  return client;
}

function buildObjectKey({ version, platformId, fileName }) {
  const safeVer = String(version || 'unknown').replace(/[^0-9A-Za-z._-]/g, '_');
  const safePlat = String(platformId || 'file').replace(/[^0-9A-Za-z._-]/g, '_');
  const base = String(fileName || `${safePlat}.bin`).replace(/[/\\]/g, '_');
  return `releases/${safeVer}/${safePlat}/${base}`;
}

/**
 * Browser uploads large installers directly to R2 (avoids Vercel body limits).
 */
async function createPresignedPut({ key, contentType = 'application/octet-stream', expiresIn = 3600 }) {
  const c = r2Config();
  const command = new PutObjectCommand({
    Bucket: c.bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn });
  return {
    uploadUrl,
    key,
    bucket: c.bucket,
    expiresIn,
    publicUrl: c.publicBase ? `${c.publicBase}/${key}` : '',
  };
}

async function createPresignedGet({ key, fileName, expiresIn }) {
  const c = r2Config();
  const ttl = expiresIn || c.signedGetTtl;
  const command = new GetObjectCommand({
    Bucket: c.bucket,
    Key: key,
    ResponseContentDisposition: fileName
      ? `attachment; filename="${String(fileName).replace(/"/g, '')}"`
      : undefined,
    ResponseContentType: 'application/octet-stream',
  });
  return getSignedUrl(getClient(), command, { expiresIn: ttl });
}

async function headObject(key) {
  const c = r2Config();
  return getClient().send(
    new HeadObjectCommand({ Bucket: c.bucket, Key: key }),
  );
}

async function deleteObject(key) {
  const c = r2Config();
  await getClient().send(
    new DeleteObjectCommand({ Bucket: c.bucket, Key: key }),
  );
}

/**
 * Resolve a download URL for a platform row.
 * Prefer public base, else short-lived signed GET.
 */
async function resolveDownloadUrl(platform) {
  if (platform.downloadUrl) return platform.downloadUrl;
  if (platform.r2Key && isConfigured()) {
    const c = r2Config();
    if (c.publicBase) return `${c.publicBase}/${platform.r2Key}`;
    return createPresignedGet({
      key: platform.r2Key,
      fileName: platform.fileName,
    });
  }
  return null;
}

module.exports = {
  r2Config,
  isConfigured,
  buildObjectKey,
  createPresignedPut,
  createPresignedGet,
  headObject,
  deleteObject,
  resolveDownloadUrl,
};
