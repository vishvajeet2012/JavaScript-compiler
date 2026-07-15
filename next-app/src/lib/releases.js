/**
 * Resolve latest desktop installers from GitHub Releases.
 * Filenames include version (e.g. Setup-1.0.0.exe) so we match by pattern,
 * not hardcoded 1.0.0 — when you publish v1.0.1, the site picks it up automatically.
 */

const OWNER = 'vishvajeet2012';
const REPO = 'JavaScript-compiler';
const API = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

/** @type {{ at: number, data: any } | null} */
let cache = null;
const CACHE_MS = 5 * 60 * 1000;

export function stripV(tag) {
  return String(tag || '').replace(/^v/i, '');
}

/**
 * @returns {Promise<{
 *   version: string,
 *   tag: string,
 *   publishedAt: string | null,
 *   htmlUrl: string,
 *   platforms: Array<Record<string, string>>,
 * }>}
 */
export async function getLatestRelease() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return cache.data;
  }

  const res = await fetch(API, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'JS-Compiler-NextApp',
    },
    // Next.js: revalidate every 5 minutes on the server
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`GitHub releases API ${res.status}`);
  }

  const json = await res.json();
  const version = stripV(json.tag_name || json.name || '0.0.0');
  const assets = Array.isArray(json.assets) ? json.assets : [];

  const find = (re) =>
    assets.find((a) => re.test(a.name) && !/\.blockmap$/i.test(a.name));

  const win = find(/Setup-.*\.exe$/i) || find(/\.exe$/i);
  const linuxApp = find(/\.AppImage$/i);
  const linuxDeb = find(/\.deb$/i);
  const macArm = find(/arm64\.dmg$/i);
  const macX64 = find(/x64\.dmg$/i);
  // Prefer Apple Silicon DMG, then Intel
  const mac = macArm || macX64;

  /** @type {Array<Record<string, string>>} */
  const platforms = [];

  if (win) {
    platforms.push({
      id: 'windows',
      name: 'Windows',
      arch: 'x64',
      file: win.name,
      label: 'Download for Windows',
      href: `/api/download?platform=windows`,
      directUrl: win.browser_download_url,
      note: 'NSIS installer · Auto-update enabled',
      size: String(win.size || ''),
    });
  }

  if (linuxApp) {
    platforms.push({
      id: 'linux',
      name: 'Linux',
      arch: 'x64 · AppImage',
      file: linuxApp.name,
      label: 'Download AppImage',
      href: `/api/download?platform=linux`,
      directUrl: linuxApp.browser_download_url,
      note: 'Portable AppImage · chmod +x then run',
      size: String(linuxApp.size || ''),
    });
  }

  if (linuxDeb) {
    platforms.push({
      id: 'linux-deb',
      name: 'Linux',
      arch: 'x64 · .deb',
      file: linuxDeb.name,
      label: 'Download .deb',
      href: `/api/download?platform=linux-deb`,
      directUrl: linuxDeb.browser_download_url,
      note: 'Debian / Ubuntu package',
      size: String(linuxDeb.size || ''),
    });
  }

  if (macArm) {
    platforms.push({
      id: 'mac-arm64',
      name: 'macOS',
      arch: 'Apple Silicon (M1/M2/M3)',
      file: macArm.name,
      label: 'Download for Mac (Apple Silicon)',
      href: `/api/download?platform=mac-arm64`,
      directUrl: macArm.browser_download_url,
      note: 'DMG installer · arm64',
      size: String(macArm.size || ''),
    });
  }

  if (macX64) {
    platforms.push({
      id: 'mac-x64',
      name: 'macOS',
      arch: 'Intel',
      file: macX64.name,
      label: 'Download for Mac (Intel)',
      href: `/api/download?platform=mac-x64`,
      directUrl: macX64.browser_download_url,
      note: 'DMG installer · x64',
      size: String(macX64.size || ''),
    });
  }

  // Always offer full releases page
  platforms.push({
    id: 'releases',
    name: 'All releases',
    arch: '',
    file: '',
    label: 'GitHub Releases',
    href: json.html_url || `https://github.com/${OWNER}/${REPO}/releases`,
    directUrl: json.html_url || `https://github.com/${OWNER}/${REPO}/releases`,
    note: 'Windows · Linux · macOS archives',
  });

  const data = {
    version,
    tag: json.tag_name || `v${version}`,
    publishedAt: json.published_at || null,
    htmlUrl: json.html_url || `https://github.com/${OWNER}/${REPO}/releases`,
    platforms,
    /** raw map for /api/download */
    urls: {
      windows: win?.browser_download_url || null,
      linux: linuxApp?.browser_download_url || null,
      'linux-deb': linuxDeb?.browser_download_url || null,
      'mac-arm64': macArm?.browser_download_url || null,
      'mac-x64': macX64?.browser_download_url || null,
      mac: mac?.browser_download_url || null,
    },
    files: {
      windows: win?.name || null,
      linux: linuxApp?.name || null,
      'linux-deb': linuxDeb?.name || null,
      'mac-arm64': macArm?.name || null,
      'mac-x64': macX64?.name || null,
    },
  };

  cache = { at: now, data };
  return data;
}

/**
 * Resolve a single platform download URL from the latest release.
 * @param {string} platform
 */
export async function getPlatformDownloadUrl(platform) {
  const release = await getLatestRelease();
  const key = String(platform || 'windows').toLowerCase();
  const map = release.urls || {};
  if (key === 'mac') return map['mac-arm64'] || map['mac-x64'] || map.mac || null;
  return map[key] || null;
}
