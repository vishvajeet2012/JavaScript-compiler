'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from './Hero.module.css';

const defaults = {
  badge: 'Desktop App · Free & Pro',
  titleLine: 'Write. Run. Save.',
  titleHighlight: 'JavaScript',
  subtitle:
    'A fast desktop JavaScript compiler with folders, templates, local DB, and Pro activation.',
  primaryCta: { label: 'Download for Windows', href: '#download' },
  secondaryCta: { label: 'Free vs Pro', href: '#compare' },
};

export default function Hero({ data }) {
  const hero = { ...defaults, ...data };
  const root = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(
        `.${styles.badge}`,
        { opacity: 0, y: 20, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8 },
      )
        .fromTo(
          `.${styles.line}`,
          { opacity: 0, y: 56 },
          { opacity: 1, y: 0, duration: 1 },
          '-=0.4',
        )
        .fromTo(
          `.${styles.gradientText}`,
          { opacity: 0, y: 40, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 1 },
          '-=0.7',
        )
        .fromTo(
          `.${styles.subtitle}`,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.85 },
          '-=0.55',
        )
        .fromTo(
          `.${styles.actions} > *`,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 },
          '-=0.45',
        )
        .fromTo(
          `.${styles.metaRow} > *`,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.06 },
          '-=0.35',
        );

      gsap.to(`.${styles.orb}`, {
        y: 24,
        scale: 1.06,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="home" className={styles.hero} ref={root}>
      <div className={styles.gridBg} aria-hidden />
      <div className={styles.orbWrapper} aria-hidden>
        <div className={styles.orb} />
        <div className={styles.orbSoft} />
      </div>

      <div className={styles.container}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          {hero.badge}
        </div>

        <h1 className={styles.heading}>
          <span className={styles.line}>{hero.titleLine}</span>
          <span className={styles.gradientText}>{hero.titleHighlight}</span>
        </h1>

        <p className={styles.subtitle}>{hero.subtitle}</p>

        <div className={styles.actions}>
          <a
            href={hero.primaryCta?.href || '#download'}
            className={styles.primaryBtn}
          >
            {hero.primaryCta?.label || 'Download'}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <a
            href={hero.secondaryCta?.href || '#compare'}
            className={styles.ghostBtn}
          >
            {hero.secondaryCta?.label || 'Free vs Pro'}
          </a>
          <a href="/jsplay" className={styles.ghostBtn}>
            Try JS Play
          </a>
        </div>

        <div className={styles.metaRow}>
          <span>Windows · Linux · macOS</span>
          <span className={styles.dot} />
          <span>Offline first</span>
          <span className={styles.dot} />
          <span>Auto-update</span>
        </div>
      </div>
    </section>
  );
}
