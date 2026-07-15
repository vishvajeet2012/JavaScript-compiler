/**
 * IP-based download limits + global counters.
 * Persistence: small JSON objects in the same R2 bucket (no DB / cookies / tokens).
 *
 * Meta keys (private, not for public download):
 *   _meta/rate/{ipHash}.json  — per-IP window
 *   _meta/stats/downloads.json — totals for admin
 */

import { createHash } from 'crypto';
import { getJsonObject, putJsonObject } from './r2';

const RATE_PREFIX = '_meta/rate/';
const STATS_KEY = '_meta/stats/downloads.json';

export function getLimitConfig() {
  return {
    maxPerIp: Number(process.env.DOWNLOAD_LIMIT_PER_IP || 5),
    windowHours: Number(process.env.DOWNLOAD_WINDOW_HOURS || 24),
  };
}

function windowMs() {
  return getLimitConfig().windowHours * 60 * 60 * 1000;
}

/** Stable hash so we don't store raw IPs in object keys (privacy). */
export function hashIp(ip) {
  return createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 32);
}

/**
 * Client IP from reverse proxies (Vercel / Cloudflare).
 */
export function getClientIp(request) {
  const h = request.headers;
  const cf = h.get('cf-connecting-ip');
  if (cf) return cf.trim();

  const real = h.get('x-real-ip');
  if (real) return real.trim();

  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();

  return '0.0.0.0';
}

function emptyStats() {
  return {
    total: 0,
    today: 0,
    todayDate: utcDateKey(),
    last24h: 0,
    lastDownloadAt: null,
    byDay: {},
  };
}

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function pruneRateWindow(record, now) {
  const w = windowMs();
  const hits = (record?.hits || []).filter((t) => now - t < w);
  return { hits };
}

/**
 * Check + consume one download slot for this IP.
 * @returns {{ allowed: boolean, remaining: number, resetAt: number|null, retryAfterSec: number|null, used: number, limit: number }}
 */
export async function consumeDownloadSlot(ip) {
  const { maxPerIp } = getLimitConfig();
  const now = Date.now();
  const key = `${RATE_PREFIX}${hashIp(ip)}.json`;

  let record = (await getJsonObject(key)) || { hits: [] };
  record = pruneRateWindow(record, now);

  if (record.hits.length >= maxPerIp) {
    const oldest = Math.min(...record.hits);
    const resetAt = oldest + windowMs();
    const retryAfterSec = Math.max(1, Math.ceil((resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      used: record.hits.length,
      limit: maxPerIp,
      resetAt,
      retryAfterSec,
    };
  }

  record.hits.push(now);
  await putJsonObject(key, record);

  return {
    allowed: true,
    remaining: Math.max(0, maxPerIp - record.hits.length),
    used: record.hits.length,
    limit: maxPerIp,
    resetAt: record.hits[0] + windowMs(),
    retryAfterSec: null,
  };
}

/** Peek remaining without consuming (optional UI). */
export async function peekDownloadSlot(ip) {
  const { maxPerIp } = getLimitConfig();
  const now = Date.now();
  const key = `${RATE_PREFIX}${hashIp(ip)}.json`;
  let record = (await getJsonObject(key)) || { hits: [] };
  record = pruneRateWindow(record, now);
  const used = record.hits.length;
  if (used >= maxPerIp) {
    const oldest = Math.min(...record.hits);
    const resetAt = oldest + windowMs();
    return {
      remaining: 0,
      used,
      limit: maxPerIp,
      resetAt,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }
  return {
    remaining: maxPerIp - used,
    used,
    limit: maxPerIp,
    resetAt: used ? record.hits[0] + windowMs() : null,
    retryAfterSec: null,
  };
}

/** Bump global download counters (admin dashboard). */
export async function recordSuccessfulDownload({ ip, userAgent } = {}) {
  const now = new Date();
  const day = utcDateKey(now);
  let stats = (await getJsonObject(STATS_KEY)) || emptyStats();

  if (stats.todayDate !== day) {
    stats.today = 0;
    stats.todayDate = day;
  }

  stats.total = (stats.total || 0) + 1;
  stats.today = (stats.today || 0) + 1;
  stats.lastDownloadAt = now.toISOString();
  stats.byDay = stats.byDay || {};
  stats.byDay[day] = (stats.byDay[day] || 0) + 1;

  // Keep last 90 days only
  const keys = Object.keys(stats.byDay).sort();
  if (keys.length > 90) {
    for (const k of keys.slice(0, keys.length - 90)) {
      delete stats.byDay[k];
    }
  }

  // last 24h approx from byDay + same-day is enough for dashboard
  const yesterday = utcDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  stats.last24h = (stats.byDay[day] || 0) + (stats.byDay[yesterday] || 0);

  await putJsonObject(STATS_KEY, stats);
  return stats;
}

export async function getDownloadStats() {
  const stats = (await getJsonObject(STATS_KEY)) || emptyStats();
  const day = utcDateKey();
  if (stats.todayDate !== day) {
    return { ...stats, today: 0, todayDate: day };
  }
  return stats;
}
