import styles from './Hero.module.css';

const defaults = {
  badge: 'Desktop App · Free & Pro',
  titleLine: 'Write. Run. Save.',
  titleHighlight: 'JavaScript',
  subtitle:
    'A fast desktop JavaScript compiler with folders, templates, local DB, and Pro activation.',
  primaryCta: { label: 'Explore Features', href: '#features' },
  secondaryCta: { label: 'Contact Us', href: '#contact' },
};

export default function Hero({ data }) {
  const hero = { ...defaults, ...data };

  return (
    <section id="home" className={styles.hero}>
      <div className={styles.orbWrapper}>
        <div className={styles.orb} />
      </div>

      <div className={styles.container}>
        <div className={styles.badge}>
          <span className={styles.badgeIcon}>✨</span>
          {hero.badge}
        </div>

        <h1 className={styles.heading}>
          <span className={styles.line}>{hero.titleLine}</span>
          <span className={styles.gradientText}>{hero.titleHighlight}</span>
        </h1>

        <p className={styles.subtitle}>{hero.subtitle}</p>

        <div className={styles.actions}>
          <a href={hero.primaryCta?.href || '#features'} className={styles.primaryBtn}>
            {hero.primaryCta?.label || 'Explore Features'}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 3L11 8L6 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <a
            href={hero.secondaryCta?.href || '#contact'}
            className={styles.ghostBtn}
          >
            {hero.secondaryCta?.label || 'Contact Us'}
          </a>
        </div>
      </div>
    </section>
  );
}
