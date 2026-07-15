import Link from 'next/link';
import { getManagedHistoryReleases } from '@/lib/managed-releases';
import { getLatestRelease } from '@/lib/releases';
import OsIcon from '@/components/OsIcon';
import styles from './releases.module.css';

export const metadata = {
  title: 'Release history | JS Compiler',
  description:
    'Older and outdated JS Compiler desktop releases for Windows, Linux, and macOS.',
  alternates: {
    canonical: '/releases',
  },
  openGraph: {
    title: 'JS Compiler — Version history',
    description: 'Browse previous desktop app releases.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(d).slice(0, 10);
  }
}

function formatBytes(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `${(num / 1024 / 1024).toFixed(1)} MB`;
}

export default async function ReleasesHistoryPage() {
  let managed = await getManagedHistoryReleases();
  let github = null;

  try {
    github = await getLatestRelease();
  } catch {
    github = null;
  }

  // If admin never marked outdated, still show GitHub latest as “current archive”
  const empty = !managed.length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
        <h1>Release history</h1>
        <p>
          Older and outdated desktop builds. Home download line is controlled
          from Admin with <code>isHome</code>. Outdated releases appear here.
        </p>
        <div className={styles.links}>
          <Link href="/#download">Current download</Link>
          <a
            href="https://github.com/vishvajeet2012/JavaScript-compiler/releases"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Releases
          </a>
        </div>
      </header>

      <main className={styles.main}>
        {empty ? (
          <div className={styles.empty}>
            <p>No outdated releases in Admin yet.</p>
            {github ? (
              <p>
                Latest GitHub tag is <strong>{github.tag}</strong>. Use Admin →
                Releases to create versions, set <code>isHome</code>, and mark
                old ones <code>isOutdated</code>.
              </p>
            ) : null}
          </div>
        ) : (
          managed.map((rel) => (
            <article key={rel._id || rel.version} className={styles.card}>
              <div className={styles.cardHead}>
                <h2>v{rel.version}</h2>
                <div className={styles.badges}>
                  {rel.isOutdated ? (
                    <span className={styles.badgeOut}>Outdated</span>
                  ) : (
                    <span className={styles.badgeMuted}>Archive</span>
                  )}
                  {rel.publishedAt ? (
                    <span className={styles.date}>
                      {formatDate(rel.publishedAt)}
                    </span>
                  ) : null}
                </div>
              </div>
              {rel.title ? <p className={styles.title}>{rel.title}</p> : null}
              {rel.notes ? <p className={styles.notes}>{rel.notes}</p> : null}

              {(rel.changelog || []).length > 0 ? (
                <ul className={styles.changelog}>
                  {rel.changelog.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}

              <div className={styles.platforms}>
                {(rel.platforms || []).map((p) => {
                  const href =
                    p.downloadUrl ||
                    p.href ||
                    `/api/download?platform=${encodeURIComponent(p.id)}`;
                  const size = formatBytes(p.size);
                  return (
                    <a
                      key={`${rel.version}-${p.id}`}
                      className={styles.plat}
                      href={href}
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel={
                        href.startsWith('http')
                          ? 'noopener noreferrer'
                          : undefined
                      }
                    >
                      <span className={styles.platIcon}>
                        <OsIcon id={p.id} size={16} />
                      </span>
                      <span className={styles.platText}>
                        <strong>{p.label || p.id}</strong>
                        <span>
                          {[p.arch, p.fileName || p.file, size]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </article>
          ))
        )}
      </main>
    </div>
  );
}
