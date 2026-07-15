/**
 * GET /api/download
 * Toolflow-style software download:
 *  1. Resolve client IP
 *  2. Enforce 5 downloads / IP / 24h when R2 meta works
 *  3. Prefer private R2 signed URL; fall back to GitHub Releases if R2 unset/broken
 */

import { NextResponse } from 'next/server';
import {
  createDownloadSignedUrl,
  getR2Config,
  headObject,
  isR2Configured,
} from '@/lib/r2';
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

function redirectDownload(url, extraHeaders = {}) {
  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...extraHeaders,
    },
  });
}

async function tryRecordStats(ip, request) {
  try {
    await recordSuccessfulDownload({
      ip,
      userAgent: request.headers.get('user-agent') || '',
    });
  } catch (err) {
    console.error('[download] stats write failed', err);
  }
}

/** Optional: ?check=1 → remaining quota only */
export async function GET(request) {
  const ip = getClientIp(request);
  const { searchParams } = new URL(request.url);
  const cfg = getR2Config();

  if (searchParams.get('check') === '1') {
    try {
      if (!isR2Configured()) {
        return NextResponse.json(
          {
            success: true,
            data: {
              remaining: null,
              used: null,
              limit: Number(process.env.DOWNLOAD_LIMIT_PER_IP || 5),
              source: 'github-fallback',
              note: 'R2 not configured — rate limit metadata unavailable',
            },
          },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
      const slot = await peekDownloadSlot(ip);
      return NextResponse.json(
        { success: true, data: { ...slot, source: 'r2' } },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (err) {
      console.error('[download] check failed', err);
      return jsonError(500, 'Could not check download quota');
    }
  }

  // ── Path A: R2 private signed URL ─────────────────────────
  if (isR2Configured()) {
    let objectOk = false;
    try {
      await headObject(cfg.objectKey);
      objectOk = true;
    } catch (err) {
      const status = err?.$metadata?.httpStatusCode;
      const name = err?.name || err?.Code || '';
      console.error('[download] R2 head failed — will try GitHub fallback', {
        key: cfg.objectKey,
        bucket: cfg.bucket,
        name,
        status,
        message: err?.message,
      });
    }

    if (objectOk) {
      let slot = {
        allowed: true,
        remaining: '?',
        limit: Number(process.env.DOWNLOAD_LIMIT_PER_IP || 5),
      };
      try {
        slot = await consumeDownloadSlot(ip);
      } catch (err) {
        console.error('[download] rate limit error (continuing)', err);
      }

      if (!slot.allowed) {
        const hours = Math.ceil((slot.retryAfterSec || 0) / 3600);
        return jsonError(
          429,
          `Download limit reached. This IP can download again in about ${hours} hour(s).`,
          {
            data: {
              limit: slot.limit,
              used: slot.used,
              remaining: 0,
              resetAt: slot.resetAt,
              retryAfterSec: slot.retryAfterSec,
            },
            retryAfterSec: slot.retryAfterSec,
          },
        );
      }

      try {
        const url = await createDownloadSignedUrl({
          objectKey: cfg.objectKey,
          filename: cfg.filename,
        });
        await tryRecordStats(ip, request);
        return redirectDownload(url, {
          'X-Download-Remaining': String(slot.remaining),
          'X-Download-Limit': String(slot.limit),
          'X-Download-Source': 'r2',
        });
      } catch (err) {
        console.error('[download] signed URL failed — GitHub fallback', err);
      }
    }
  } else {
    console.warn(
      '[download] R2 env missing on this host — using GitHub fallback',
    );
  }

  // ── Path B: GitHub Releases (works without R2 env on Vercel) ──
  const fallback = cfg.githubFallbackUrl;
  if (!fallback) {
    return jsonError(
      503,
      'Download not available. Configure R2_* env vars on Vercel or set DOWNLOAD_GITHUB_FALLBACK_URL.',
    );
  }

  await tryRecordStats(ip, request).catch(() => {});

  return redirectDownload(fallback, {
    'X-Download-Source': 'github',
  });
}
