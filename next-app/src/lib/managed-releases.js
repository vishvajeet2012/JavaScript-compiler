/**
 * Managed releases from Express API (admin-controlled).
 * Uses unstable_cache for short revalidation (admin updates show within TTL).
 */

import { unstable_cache } from 'next/cache';
import { FALLBACK_API_URL } from './fallback';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || FALLBACK_API_URL;

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    // Always hit origin; outer unstable_cache handles caching
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`releases API ${res.status} ${path}`);
  }
  const body = await res.json();
  if (!body?.success) {
    throw new Error(body?.message || 'releases API error');
  }
  return body.data;
}

const getHomeCached = unstable_cache(
  async () => fetchJson('/releases/home'),
  ['managed-releases-home'],
  { revalidate: 30, tags: ['releases-home'] },
);

const getHistoryCached = unstable_cache(
  async () => fetchJson('/releases/history'),
  ['managed-releases-history'],
  { revalidate: 60, tags: ['releases-history'] },
);

export async function getManagedHomeReleases() {
  try {
    const data = await getHomeCached();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[managed-releases] home failed', err?.message || err);
    return [];
  }
}

export async function getManagedHistoryReleases() {
  try {
    const data = await getHistoryCached();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[managed-releases] history failed', err?.message || err);
    return [];
  }
}

/**
 * All published releases for public changelog / What's New page.
 * Home first, then history; de-dupe by version.
 */
export async function getManagedChangelogReleases() {
  const [home, history] = await Promise.all([
    getManagedHomeReleases(),
    getManagedHistoryReleases(),
  ]);
  const map = new Map();
  for (const r of [...home, ...history]) {
    const v = String(r.version || '').replace(/^v/i, '');
    if (!v || map.has(v)) continue;
    map.set(v, r);
  }
  return Array.from(map.values()).sort((a, b) => {
    const da = new Date(a.publishedAt || 0).getTime();
    const db = new Date(b.publishedAt || 0).getTime();
    return db - da;
  });
}

/**
 * Convert managed release docs → Download component shape (platforms with /api/download).
 */
export function homeReleasesToDownloadBlock(releases) {
  if (!releases?.length) return null;

  const primary = releases[0];
  const platforms = [];

  for (const rel of releases) {
    for (const p of rel.platforms || []) {
      if (!p.id) continue;
      platforms.push({
        id: p.id,
        name: p.name || p.id,
        arch: p.arch || '',
        file: p.fileName || p.file || '',
        label: p.label || `Download ${p.id}`,
        href: `/api/download?platform=${encodeURIComponent(p.id)}`,
        note: p.note || `v${rel.version}`,
        size: p.size || '',
        version: rel.version,
      });
    }
  }

  if (!platforms.length) return null;

  platforms.push({
    id: 'releases',
    name: 'Version history',
    arch: '',
    file: '',
    label: 'All releases',
    href: '/releases',
    note: 'Older & outdated versions',
  });

  const changelog = (primary.changelog || []).length
    ? [
        {
          version: primary.version,
          date: primary.publishedAt
            ? String(primary.publishedAt).slice(0, 10)
            : '',
          items: primary.changelog,
        },
      ]
    : [
        {
          version: primary.version,
          date: primary.publishedAt
            ? String(primary.publishedAt).slice(0, 10)
            : '',
          items: [
            primary.notes || `Managed release v${primary.version}`,
            'Updated from Admin · isHome',
          ],
        },
      ];

  return {
    title: 'Download JS Compiler',
    subtitle: `Home release v${primary.version}${
      releases.length > 1 ? ` (+${releases.length - 1} more)` : ''
    } — managed from Admin`,
    version: primary.version,
    tag: `v${primary.version}`,
    platforms,
    changelog,
    requirements: [
      'Windows 10/11, Linux x64, or macOS 11+',
      'Internet only for activation & updates',
      'Works fully offline for coding',
    ],
    source: 'managed',
  };
}
