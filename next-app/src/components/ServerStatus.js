import styles from './ServerStatus.module.css';

/**
 * Shows whether next-app is connected to Express server
 * @param {{ online: boolean, health?: object | null }} props
 */
export default function ServerStatus({ online, health }) {
  return (
    <div
      className={`${styles.badge} ${online ? styles.online : styles.offline}`}
      title={
        online
          ? `API uptime: ${health?.uptime || '—'}`
          : 'Start server with: npm run dev (in server/)'
      }
    >
      <span className={styles.dot} />
      <span className={styles.text}>
        {online ? 'API Connected' : 'API Offline'}
      </span>
    </div>
  );
}
