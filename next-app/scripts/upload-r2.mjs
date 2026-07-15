/**
 * Upload Windows installer to R2.
 * Usage: node scripts/upload-r2.mjs [localPath]
 */

import { readFileSync, existsSync, createReadStream, statSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const repoRoot = resolve(root, '..');
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

loadEnvLocal();

const endpoint =
  process.env.R2_ENDPOINT ||
  `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const bucket = process.env.R2_BUCKET_NAME || 'javascript';
const objectKey =
  process.env.R2_OBJECT_KEY || 'releases/JS-Compiler-Setup-1.0.0.exe';
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const defaultLocal = resolve(
  repoRoot,
  'javascript-compiler/dist/JS Compiler-Setup-1.0.0.exe',
);
const localPath = resolve(process.argv[2] || defaultLocal);

if (!existsSync(localPath)) {
  console.error('Local file not found:', localPath);
  process.exit(1);
}

const size = statSync(localPath).size;
console.log('=== R2 UPLOAD ===');
console.log('Local:', localPath);
console.log('Size:', (size / 1024 / 1024).toFixed(2), 'MB');
console.log('Bucket:', bucket);
console.log('Key:', objectKey);
console.log('');

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

// Multipart for large installer
const upload = new Upload({
  client,
  params: {
    Bucket: bucket,
    Key: objectKey,
    Body: createReadStream(localPath),
    ContentType: 'application/octet-stream',
    ContentDisposition: `attachment; filename="${basename(localPath)}"`,
  },
  queueSize: 4,
  partSize: 8 * 1024 * 1024,
});

upload.on('httpUploadProgress', (p) => {
  if (!p.total) return;
  const pct = ((p.loaded / p.total) * 100).toFixed(1);
  process.stdout.write(`\rUploading… ${pct}% (${Math.round(p.loaded / 1024 / 1024)} MB)`);
});

try {
  const result = await upload.done();
  console.log('\n');
  console.log('Upload OK');
  console.log('ETag:', result.ETag);
  console.log('Location key:', objectKey);
  console.log('RESULT: PASS');
} catch (err) {
  console.error('\nUpload failed:', err.name, err.message);
  process.exit(1);
}
