/**
 * GET /api/download/stats
 * Admin download counters (total, today, by day).
 * Auth: Authorization: Bearer <DOWNLOAD_STATS_SECRET> or x-admin-secret header.
 * No public access.
 */

import { NextResponse } from 'next/server';
import { getDownloadStats } from '@/lib/download-limiter';
import { getR2Config } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request) {
  const secret =
    process.env.DOWNLOAD_STATS_SECRET ||
    process.env.ADMIN_SECRET ||
    process.env.R2_API_TOKEN;
  if (!secret) return false;

  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const header = request.headers.get('x-admin-secret') || '';
  return bearer === secret || header === secret;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const stats = await getDownloadStats();
    const cfg = getR2Config();
    return NextResponse.json(
      {
        success: true,
        data: {
          ...stats,
          file: {
            bucket: cfg.bucket,
            objectKey: cfg.objectKey,
            filename: cfg.filename,
          },
          limit: {
            perIp: Number(process.env.DOWNLOAD_LIMIT_PER_IP || 5),
            windowHours: Number(process.env.DOWNLOAD_WINDOW_HOURS || 24),
          },
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[download/stats]', err);
    return NextResponse.json(
      { success: false, message: 'Failed to load download stats' },
      { status: 500 },
    );
  }
}
