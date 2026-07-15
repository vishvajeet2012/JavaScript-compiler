/**
 * Cloudflare R2 (S3-compatible) client for private software downloads.
 * Secrets come from env only — never from client or fallback.
 */

import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);

  return {
    accountId,
    endpoint,
    bucket: process.env.R2_BUCKET_NAME || 'javascript',
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    objectKey:
      process.env.R2_OBJECT_KEY || 'releases/JS-Compiler-Setup-1.0.0.exe',
    filename:
      process.env.R2_DOWNLOAD_FILENAME || 'JS Compiler-Setup-1.0.0.exe',
    /** Signed URL lifetime (seconds) — short, Toolflow-style */
    signedUrlTtl: Number(process.env.R2_SIGNED_URL_TTL || 300),
    /**
     * Public fallback if R2 is not configured on the host (e.g. Vercel missing env).
     * Prefer R2 when credentials work.
     */
    // Prefer dynamic GitHub latest via lib/releases.js; this is only a last-resort URL.
    githubFallbackUrl: process.env.DOWNLOAD_GITHUB_FALLBACK_URL || '',
  };
}

/** True when Access Key + Secret are present (required for private R2). */
export function isR2Configured() {
  const cfg = getR2Config();
  return Boolean(
    (cfg.endpoint || cfg.accountId) &&
      cfg.accessKeyId &&
      cfg.secretAccessKey &&
      cfg.bucket &&
      cfg.objectKey,
  );
}

let client;

export function getR2Client() {
  if (client) return client;
  const cfg = getR2Config();
  if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error('R2 credentials not configured (R2_ENDPOINT / keys)');
  }
  client = new S3Client({
    region: 'auto',
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: true,
  });
  return client;
}

/**
 * Professional download: short-lived presigned GET with Content-Disposition attachment.
 * Browser saves the real .exe name (Toolflow-style).
 */
export async function createDownloadSignedUrl({
  objectKey,
  filename,
  expiresIn,
} = {}) {
  const cfg = getR2Config();
  const key = objectKey || cfg.objectKey;
  const name = filename || cfg.filename;
  const ttl = expiresIn ?? cfg.signedUrlTtl;

  const command = new GetObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${name.replace(/"/g, '')}"`,
    ResponseContentType: 'application/octet-stream',
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: ttl });
}

export async function headObject(key) {
  const cfg = getR2Config();
  return getR2Client().send(
    new HeadObjectCommand({
      Bucket: cfg.bucket,
      Key: key || cfg.objectKey,
    }),
  );
}

/** Read a small JSON object from R2 (rate-limit / stats). Returns null if missing. */
export async function getJsonObject(key) {
  const cfg = getR2Config();
  try {
    const out = await getR2Client().send(
      new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
    );
    const text = await out.Body.transformToString();
    return JSON.parse(text);
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

/** Write a small JSON object to R2 */
export async function putJsonObject(key, data) {
  const cfg = getR2Config();
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    }),
  );
}
