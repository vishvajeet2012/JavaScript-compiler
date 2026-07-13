import styles from './page.module.css';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Stats from '@/components/Stats';
import About from '@/components/About';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import { getLanding, getHealth } from '@/lib/api';
import { FALLBACK_LANDING } from '@/lib/fallback';

/**
 * Home / Landing page — data from Express server (server/)
 * Falls back to static content if API is offline
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
    // Server offline — use fallback content
    serverOnline = false;
  }

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
