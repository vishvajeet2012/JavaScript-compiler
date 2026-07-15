/**
 * GET /api/download?platform=windows|linux|linux-deb|mac|mac-arm64|mac-x64
 *
 * Windows: R2 signed URL when configured, else latest GitHub asset
 * Linux / macOS: always latest GitHub Releases asset (live version, not hardcoded 1.0.0)
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
import { getLatestRelease, getPlatformDownloadUrl } from '@/lib/releases';

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

function normalizePlatform(raw) {
  const p = String(raw || 'windows').toLowerCase().trim();
  if (p === 'win' || p === 'windows-x64') return 'windows';
  if (p === 'appimage') return 'linux';
  if (p === 'deb') return 'linux-deb';
  if (p === 'macos' || p === 'osx' || p === 'darwin') return 'mac';
  if (p === 'mac-arm' || p === 'arm64') return 'mac-arm64';
  if (p === 'mac-intel' || p === 'intel') return 'mac-x64';
  return p;
}

export async function GET(request) {
  const ip = getClientIp(request);
  const { searchParams } = new URL(request.url);
  const platform = normalizePlatform(searchParams.get('platform') || 'windows');

  if (searchParams.get('check') === '1') {
    try {
      if (!isR2Configured() || platform !== 'windows') {
        const release = await getLatestRelease().catch(() => null);
        return NextResponse.json(
          {
            success: true,
            data: {
              remaining: null,
              limit: Number(process.env.DOWNLOAD_LIMIT_PER_IP || 5),
              platform,
              version: release?.version || null,
              source: platform === 'windows' ? 'github-or-r2' : 'github',
            },
          },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
      const slot = await peekDownloadSlot(ip);
      return NextResponse.json(
        { success: true, data: { ...slot, platform, source: 'r2' } },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (err) {
      console.error('[download] check failed', err);
      return jsonError(500, 'Could not check download quota');
    }
  }

  // ── Optional: Windows via R2 only when explicitly preferred ──
  // Default is always GitHub *latest* so the site never sticks on an old R2 upload.
  const preferR2 =
    process.env.DOWNLOAD_PREFER_R2 === '1' ||
    process.env.DOWNLOAD_PREFER_R2 === 'true';

  if (platform === 'windows' && preferR2 && isR2Configured()) {
    const cfg = getR2Config();
    let objectOk = false;
    try {
      await headObject(cfg.objectKey);
      objectOk = true;
    } catch (err) {
      console.error('[download] R2 head failed — GitHub latest fallback', {
        key: cfg.objectKey,
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
          'X-Download-Platform': 'windows',
        });
      } catch (err) {
        console.error('[download] signed URL failed', err);
      }
    }
  }

  // ── All platforms: latest asset from GitHub Releases API ─
  try {
    const url = await getPlatformDownloadUrl(platform);
    if (!url) {
      const release = await getLatestRelease().catch(() => null);
      return jsonError(404, `No installer found for platform "${platform}".`, {
        data: {
          platform,
          version: release?.version || null,
          available: release?.urls || {},
        },
      });
    }

    // Soft rate-limit only when R2 meta works (windows primary path already handled)
    if (platform === 'windows' && isR2Configured()) {
      try {
        const slot = await consumeDownloadSlot(ip);
        if (!slot.allowed) {
          const hours = Math.ceil((slot.retryAfterSec || 0) / 3600);
          return jsonError(
            429,
            `Download limit reached. Try again in about ${hours} hour(s).`,
            {
              data: { retryAfterSec: slot.retryAfterSec },
              retryAfterSec: slot.retryAfterSec,
            },
          );
        }
      } catch {
        /* ignore */
      }
    }

    await tryRecordStats(ip, request);
    const release = await getLatestRelease().catch(() => null);

    return redirectDownload(url, {
      'X-Download-Source': 'github-latest',
      'X-Download-Platform': platform,
      ...(release?.version
        ? { 'X-Download-Version': release.version }
        : {}),
    });
  } catch (err) {
    console.error('[download] GitHub latest resolve failed', err);
    return jsonError(
      503,
      'Could not resolve latest release. Try again or open GitHub Releases.',
      {
        data: {
          releases:
            'https://github.com/vishvajeet2012/JavaScript-compiler/releases',
        },
      },
    );
  }
}
