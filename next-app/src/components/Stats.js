import styles from './Stats.module.css';

export default function Stats({ stats = [] }) {
  const list =
    stats.length > 0
      ? stats
      : [
          { value: '1-Click', label: 'Run JS Code' },
          { value: 'Offline', label: 'Works Without Internet' },
          { value: 'Local DB', label: 'Snippets Saved Safely' },
          { value: 'Pro', label: 'Activation Ready' },
        ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {list.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <span className={styles.value}>{stat.value}</span>
            <span className={styles.label}>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
