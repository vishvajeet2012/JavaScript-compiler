'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from './Hero.module.css';

const defaults = {
  badge: 'Desktop · Free & Pro',
  titleLine: 'Write. Run. Save.',
  titleHighlight: 'JavaScript',
  subtitle:
    'Offline desktop compiler with folders, templates, local storage, and Pro languages when you need them.',
  primaryCta: { label: 'Download for Windows', href: '#download' },
  secondaryCta: { label: 'Free vs Pro', href: '#compare' },
};

export default function Hero({ data }) {
  const hero = { ...defaults, ...data };
  const root = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        [
          `.${styles.badge}`,
          `.${styles.heading}`,
          `.${styles.subtitle}`,
          `.${styles.actions}`,
          `.${styles.metaRow}`,
        ],
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power2.out',
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="home" className={styles.hero} ref={root}>
      <div className={styles.container}>
        <p className={styles.badge}>{hero.badge}</p>

        <h1 className={styles.heading}>
          <span className={styles.line}>{hero.titleLine}</span>
          <span className={styles.accent}>{hero.titleHighlight}</span>
        </h1>

        <p className={styles.subtitle}>{hero.subtitle}</p>

        <div className={styles.actions}>
          <a
            href={hero.primaryCta?.href || '#download'}
            className={styles.primaryBtn}
          >
            {hero.primaryCta?.label || 'Download'}
          </a>
          <a
            href={hero.secondaryCta?.href || '#compare'}
            className={styles.secondaryBtn}
          >
            {hero.secondaryCta?.label || 'Free vs Pro'}
          </a>
          <a href="/jsplay" className={styles.ghostBtn}>
            Try JS Play
          </a>
        </div>

        <p className={styles.metaRow}>
          Windows · Linux · macOS
          <span className={styles.sep}>·</span>
          Offline first
          <span className={styles.sep}>·</span>
          Auto-update
        </p>
      </div>
    </section>
  );
}
