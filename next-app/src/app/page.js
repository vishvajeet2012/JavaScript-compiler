import styles from './page.module.css';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Download from '@/components/Download';
import Pricing from '@/components/Pricing';
import Features from '@/components/Features';
import Stats from '@/components/Stats';
import About from '@/components/About';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import { getLanding, getHealth } from '@/lib/api';
import { FALLBACK_LANDING } from '@/lib/fallback';
import { getLatestRelease } from '@/lib/releases';

/**
 * Merge live GitHub latest installers (Win/Linux/Mac) into landing download block.
 */
async function withLatestDownloads(landing) {
  try {
    const release = await getLatestRelease();
    const published = release.publishedAt
      ? release.publishedAt.slice(0, 10)
      : '';

    return {
      ...landing,
      download: {
        ...landing.download,
        title: landing.download?.title || 'Download JS Compiler',
        subtitle: `Latest build for Windows, Linux, and macOS · ${release.tag}`,
        version: release.version,
        tag: release.tag,
        htmlUrl: release.htmlUrl,
        platforms: release.platforms,
        changelog: [
          {
            version: release.version,
            date: published,
            items: [
              `Latest release ${release.tag}`,
              'Windows NSIS · Linux AppImage/deb · macOS DMG (Intel + Apple Silicon)',
              'In-app auto-update after install',
              'See GitHub release notes for full changelog',
            ],
          },
          ...(Array.isArray(landing.download?.changelog)
            ? landing.download.changelog.filter(
                (c) => c.version !== release.version && c.version !== 'latest',
              )
            : []),
        ],
        requirements: [
          'Windows 10/11 (64-bit), Linux x64, or macOS 11+',
          'Internet only for activation & updates',
          'Works fully offline for coding',
        ],
      },
    };
  } catch (err) {
    console.error('[home] latest release fetch failed', err?.message || err);
    return landing;
  }
}

/**
 * Home / Landing page — data from Express server (server/)
 * Download section always prefers live GitHub latest assets.
 */
export default async function Home() {
  let landing = FALLBACK_LANDING;
  let health = null;
  let serverOnline = false;

  try {
    const [landingRes, healthRes] = await Promise.all([
      getLanding(),
      getHealth(),
    ]);

    if (landingRes?.success && landingRes.data) {
      landing = landingRes.data;
      serverOnline = true;
    }

    if (healthRes?.success && healthRes.data) {
      health = healthRes.data;
      serverOnline = true;
    }
  } catch {
    serverOnline = false;
  }

  landing = await withLatestDownloads(landing);

  return (
    <div className={styles.page}>
      <Header
        brand={landing.brand}
        serverOnline={serverOnline}
        health={health}
      />
      <main className={styles.main}>
        <Hero data={landing.hero} />
        <hr className={styles.divider} />
        <Download data={landing.download} />
        <hr className={styles.divider} />
        <Pricing />
        <hr className={styles.divider} />
        <Features features={landing.features} />
        <hr className={styles.divider} />
        <Stats stats={landing.stats} />
        <hr className={styles.divider} />
        <About data={landing.about} />
        <hr className={styles.divider} />
        <Contact data={landing.contact} serverOnline={serverOnline} />
      </main>
      <Footer brand={landing.brand} />
    </div>
  );
}
