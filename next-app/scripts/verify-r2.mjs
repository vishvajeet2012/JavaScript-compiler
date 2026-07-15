/**
 * Verify Cloudflare R2 credentials + installer object.
 * Usage: node scripts/verify-r2.mjs
 * Loads next-app/.env.local if present.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env.local');

function loadEnvLocal() {
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function fmtBytes(n) {
  if (n == null) return 'n/a';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

loadEnvLocal();

const endpoint =
  process.env.R2_ENDPOINT ||
  (process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : null);
const bucket = process.env.R2_BUCKET_NAME || 'javascript';
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const objectKey =
  process.env.R2_OBJECT_KEY || 'releases/JS-Compiler-Setup-1.0.0.exe';

console.log('=== R2 VERIFY ===');
console.log('Endpoint:', endpoint || '(missing)');
console.log('Bucket:', bucket);
console.log('Expected key:', objectKey);
console.log('Access key set:', Boolean(accessKeyId));
console.log('Secret set:', Boolean(secretAccessKey));
console.log('');

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.log('RESULT: FAIL — missing R2 credentials in env');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

try {
  const list = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 100 }),
  );
  const contents = list.Contents || [];
  console.log(`ListObjects: OK (${contents.length} object(s))`);
  if (contents.length === 0) {
    console.log('Bucket is EMPTY — nothing uploaded yet.');
  } else {
    console.log('--- Objects ---');
    for (const o of contents) {
      const when = o.LastModified
        ? new Date(o.LastModified).toISOString()
        : 'n/a';
      console.log(` - ${o.Key} | ${fmtBytes(o.Size)} | ${when}`);
    }
  }
  console.log('');

  try {
    const head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
    );
    console.log('HeadObject (expected key): FOUND');
    console.log('  Size:', fmtBytes(head.ContentLength));
    console.log('  Type:', head.ContentType || 'n/a');
    console.log('  ETag:', head.ETag);
    console.log(
      '  LastModified:',
      head.LastModified
        ? new Date(head.LastModified).toISOString()
        : 'n/a',
    );
    console.log('');
    console.log('RESULT: PASS — installer is on R2 at the expected path');
    process.exit(0);
  } catch (e) {
    console.log('HeadObject (expected key): MISSING');
    console.log('  Error:', e.name || e.Code || e.message);
    const match = (contents || []).find((c) =>
      /setup|compiler|\.exe/i.test(c.Key || ''),
    );
    if (match) {
      console.log('  Hint: similar file found →', match.Key);
      console.log('  Fix: set R2_OBJECT_KEY=' + match.Key);
    } else if (contents.length) {
      console.log('  Hint: upload to path:', objectKey);
    } else {
      console.log('  Hint: upload file to bucket:', bucket);
      console.log('  Path:   ', objectKey);
    }
    console.log('');
    console.log('RESULT: FAIL — expected path not found');
    process.exit(1);
  }
} catch (err) {
  console.log('ListObjects: FAILED');
  console.log('  Name:', err.name);
  console.log('  Code:', err.Code || err.code);
  console.log('  Message:', err.message);
  console.log('  HTTP:', err.$metadata?.httpStatusCode);
  console.log('');
  console.log('RESULT: FAIL — credentials, bucket name, or endpoint issue');
  process.exit(1);
}
