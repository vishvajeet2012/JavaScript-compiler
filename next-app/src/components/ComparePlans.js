import styles from './ComparePlans.module.css';

const ROWS = [
  {
    feature: 'JavaScript run & save',
    free: true,
    pro: true,
  },
  {
    feature: 'Local snippets (SQLite)',
    free: 'Up to 5',
    pro: 'Unlimited',
  },
  {
    feature: 'Folders & workspace',
    free: true,
    pro: true,
  },
  {
    feature: 'TypeScript',
    free: false,
    pro: true,
  },
  {
    feature: 'HTML + JS',
    free: false,
    pro: true,
  },
  {
    feature: 'Node mode + npm install',
    free: false,
    pro: true,
  },
  {
    feature: 'Export files',
    free: false,
    pro: true,
  },
  {
    feature: 'Version history (snapshots)',
    free: false,
    pro: true,
  },
  {
    feature: 'In-app auto-update',
    free: true,
    pro: true,
  },
  {
    feature: 'What’s New / release notes',
    free: true,
    pro: true,
  },
  {
    feature: '7-day free trial key',
    free: 'Available',
    pro: '—',
  },
  {
    feature: 'Promo / Student / Team licenses',
    free: false,
    pro: true,
  },
];

function Cell({ value }) {
  if (value === true) {
    return <span className={styles.yes}>✓</span>;
  }
  if (value === false) {
    return <span className={styles.no}>—</span>;
  }
  return <span className={styles.text}>{value}</span>;
}

export default function ComparePlans() {
  return (
    <section id="compare" className={styles.section}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Plans</p>
        <h2 className={styles.title}>Free vs Pro</h2>
        <p className={styles.subtitle}>
          Free is enough to write and run JavaScript offline. Pro unlocks languages,
          npm packages, export, and history.
        </p>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Free</th>
                <th scope="col">Pro</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  <td>
                    <Cell value={row.free} />
                  </td>
                  <td>
                    <Cell value={row.pro} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.ctaRow}>
          <a className={styles.ctaPrimary} href="#download">
            Download free
          </a>
          <a className={styles.ctaSecondary} href="#pricing">
            See pricing
          </a>
          <a className={styles.ctaGhost} href="/changelog">
            What’s New
          </a>
        </div>
      </div>
    </section>
  );
}
