import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section id="home" className={styles.hero}>
      {/* Animated gradient orb */}
      <div className={styles.orbWrapper}>
        <div className={styles.orb} />
      </div>

      <div className={styles.container}>
        <div className={styles.badge}>
          <span className={styles.badgeIcon}>✨</span>
          Available for Freelance Projects
        </div>

        <h1 className={styles.heading}>
          <span className={styles.line}>Build Something</span>
          <span className={styles.gradientText}>Amazing</span>
        </h1>

        <p className={styles.subtitle}>
          Full Stack Developer crafting modern web experiences with cutting-edge
          technologies. From concept to deployment.
        </p>

        <div className={styles.actions}>
          <a href="#features" className={styles.primaryBtn}>
            View Projects
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
          <a href="#contact" className={styles.ghostBtn}>
            Contact Me
          </a>
        </div>
      </div>
    </section>
  );
}
