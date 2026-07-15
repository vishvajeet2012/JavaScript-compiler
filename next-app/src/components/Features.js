import styles from './Features.module.css';

export default function Features({ features = [] }) {
  const list =
    features.length > 0
      ? features
      : [
          {
            icon: '⚡',
            title: 'Instant Run',
            description: 'Write and execute JavaScript snippets instantly.',
          },
        ];

  return (
    <section id="features" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Features</h2>
          <p className={styles.subtitle}>
            Everything you need to write, run, and organize JavaScript
          </p>
        </div>

        <div className={styles.grid} data-reveal-stagger>
          {list.map((feature) => (
            <div
              key={feature.title}
              className={styles.card}
              data-reveal-child
            >
              <span className={styles.icon}>{feature.icon}</span>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
