import styles from './page.module.css';
import SmoothScroll from '@/components/motion/SmoothScroll';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Download from '@/components/Download';
import Pricing from '@/components/Pricing';
import ComparePlans from '@/components/ComparePlans';
import Features from '@/components/Features';
import Stats from '@/components/Stats';
import About from '@/components/About';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import PromoPopup from '@/components/PromoPopup';
import { getLanding, getHealth } from '@/lib/api';
import { FALLBACK_LANDING } from '@/lib/fallback';
import { getLatestRelease } from '@/lib/releases';
import {
  getManagedHomeReleases,
  homeReleasesToDownloadBlock,
} from '@/lib/managed-releases';

async function withGithubDownloads(landing) {
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
        subtitle: `Latest GitHub build · ${release.tag}`,
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
              'Windows · Linux · macOS from GitHub Releases',
              'In-app auto-update after install',
            ],
          },
        ],
        requirements: [
          'Windows 10/11 (64-bit), Linux x64, or macOS 11+',
          'Internet only for activation & updates',
          'Works fully offline for coding',
        ],
        source: 'github',
      },
    };
  } catch (err) {
    console.error('[home] github release fetch failed', err?.message || err);
    return landing;
  }
}

async function withDownloadSection(landing) {
  const managed = await getManagedHomeReleases();
  const block = homeReleasesToDownloadBlock(managed);
  if (block) {
    return { ...landing, download: { ...landing.download, ...block } };
  }
  return withGithubDownloads(landing);
}

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

  landing = await withDownloadSection(landing);

  return (
    <SmoothScroll>
      <div className={styles.page}>
        <PromoPopup />
        <Header
          brand={landing.brand}
          serverOnline={serverOnline}
          health={health}
        />
        <main className={styles.main}>
          <Hero data={landing.hero} />
          <hr className={styles.divider} />
          <div data-reveal>
            <Download data={landing.download} />
          </div>
          <hr className={styles.divider} />
          <div data-reveal>
            <ComparePlans />
          </div>
          <hr className={styles.divider} />
          <div data-reveal>
            <Pricing />
          </div>
          <hr className={styles.divider} />
          <div data-reveal>
            <Features features={landing.features} />
          </div>
          <hr className={styles.divider} />
          <div data-reveal>
            <Stats stats={landing.stats} />
          </div>
          <hr className={styles.divider} />
          <div data-reveal>
            <About data={landing.about} />
          </div>
          <hr className={styles.divider} />
          <div data-reveal>
            <Contact data={landing.contact} serverOnline={serverOnline} />
          </div>
        </main>
        <Footer brand={landing.brand} />
      </div>
    </SmoothScroll>
  );
}
