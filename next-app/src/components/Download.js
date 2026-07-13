import styles from './Download.module.css';

const defaults = {
  title: 'Download JS Compiler',
  subtitle: 'Free desktop app with auto-updates.',
  version: '1.0.0',
  platforms: [],
  changelog: [],
  requirements: [],
};

export default function Download({ data }) {
  const d = { ...defaults, ...data };
  const platforms = d.platforms || [];
  const changelog = d.changelog || [];
  const requirements = d.requirements || [];

  return (
    <section id="download" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Get the app</p>
          <h2 className={styles.title}>{d.title}</h2>
          <p className={styles.subtitle}>{d.subtitle}</p>
          <span className={styles.versionBadge}>v{d.version}</span>
        </div>

        <div className={styles.grid}>
          <div className={styles.cards}>
            {platforms.map((p) => (
              <a
                key={p.id || p.label}
                href={p.href}
                className={styles.card}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.cardTop}>
                  <span className={styles.osIcon}>
                    {p.id === 'windows' ? '🪟' : '📦'}
                  </span>
                  <div>
                    <h3>{p.name}</h3>
                    {p.arch ? <p className={styles.meta}>{p.arch}</p> : null}
                  </div>
                </div>
                <span className={styles.downloadBtn}>{p.label}</span>
                {p.note ? <p className={styles.note}>{p.note}</p> : null}
              </a>
            ))}
          </div>

          <div className={styles.side}>
            <div className={styles.panel}>
              <h3>Requirements</h3>
              <ul>
                {requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>

            <div className={styles.panel}>
              <h3>Changelog</h3>
              {changelog.length === 0 ? (
                <p className={styles.muted}>No entries yet.</p>
              ) : (
                changelog.map((c) => (
                  <div key={c.version} className={styles.changeBlock}>
                    <div className={styles.changeHead}>
                      <strong>v{c.version}</strong>
                      <span>{c.date}</span>
                    </div>
                    <ul>
                      {(c.items || []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
