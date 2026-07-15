/**
 * GET /api/download
 * Toolflow-style software download:
 *  1. Resolve client IP (no cookies / tokens)
 *  2. Enforce 5 downloads / IP / 24h (R2 meta store)
 *  3. Increment admin counters
 *  4. 302 redirect to short-lived R2 signed URL with attachment filename
 */

import { NextResponse } from 'next/server';
import { createDownloadSignedUrl, getR2Config, headObject } from '@/lib/r2';
import {
  consumeDownloadSlot,
  getClientIp,
  peekDownloadSlot,
  recordSuccessfulDownload,
} from '@/lib/download-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(status, message, extra = {}) {
  return NextResponse.json(
    { success: false, message, ...extra },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...(extra.retryAfterSec
          ? { 'Retry-After': String(extra.retryAfterSec) }
          : {}),
      },
    },
  );
}

/** Optional: ?check=1 → remaining quota only, no consume */
export async function GET(request) {
  const ip = getClientIp(request);
  const { searchParams } = new URL(request.url);

  if (searchParams.get('check') === '1') {
    try {
      const slot = await peekDownloadSlot(ip);
      return NextResponse.json(
        { success: true, data: slot },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (err) {
      console.error('[download] check failed', err);
      return jsonError(500, 'Could not check download quota');
    }
  }

  const cfg = getR2Config();

  // Ensure object exists before consuming a rate-limit slot
  try {
    await headObject(cfg.objectKey);
  } catch (err) {
    console.error('[download] object missing', cfg.objectKey, err?.name || err);
    return jsonError(
      404,
      'Installer file not found in storage. Upload the .exe to R2 first.',
      { data: { objectKey: cfg.objectKey, bucket: cfg.bucket } },
    );
  }

  let slot;
  try {
    slot = await consumeDownloadSlot(ip);
  } catch (err) {
    console.error('[download] rate limit error', err);
    return jsonError(503, 'Download service temporarily unavailable');
  }

  if (!slot.allowed) {
    const hours = Math.ceil((slot.retryAfterSec || 0) / 3600);
    return jsonError(429, `Download limit reached. This IP can download again in about ${hours} hour(s).`, {
      data: {
        limit: slot.limit,
        used: slot.used,
        remaining: 0,
        resetAt: slot.resetAt,
        retryAfterSec: slot.retryAfterSec,
      },
      retryAfterSec: slot.retryAfterSec,
    });
  }

  let url;
  try {
    url = await createDownloadSignedUrl({
      objectKey: cfg.objectKey,
      filename: cfg.filename,
    });
  } catch (err) {
    console.error('[download] signed URL failed', err);
    return jsonError(500, 'Could not prepare download');
  }

  // Admin stats (best-effort — don't fail the download)
  try {
    await recordSuccessfulDownload({
      ip,
      userAgent: request.headers.get('user-agent') || '',
    });
  } catch (err) {
    console.error('[download] stats write failed', err);
  }

  // 302 → browser downloads .exe with correct name (professional installer UX)
  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Download-Remaining': String(slot.remaining),
      'X-Download-Limit': String(slot.limit),
    },
  });
}
