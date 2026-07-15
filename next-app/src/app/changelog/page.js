import Link from 'next/link';
import { getManagedChangelogReleases } from '@/lib/managed-releases';
import { CHANGELOG_FALLBACK } from '@/lib/changelog-fallback';
import styles from './changelog.module.css';

export const metadata = {
  title: 'What’s New · Changelog | JS Compiler',
  description:
    'Public release notes for JS Compiler desktop app — Added, Fixed, Changed, Removed for every version.',
  alternates: { canonical: '/changelog' },
  openGraph: {
    title: 'JS Compiler — What’s New',
    description: 'Public changelog and release notes.',
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

function Section({ title, items, className }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div className={className}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function ChangelogPage() {
  let releases = await getManagedChangelogReleases();
  if (!releases.length) {
    releases = CHANGELOG_FALLBACK;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'JS Compiler',
    applicationCategory: 'DeveloperApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    releaseNotes: releases.map((r) => ({
      '@type': 'SoftwareApplication',
      name: `JS Compiler v${r.version}`,
      datePublished: r.publishedAt || undefined,
      releaseNotes: r.notes || (r.changelog || []).join('; '),
    })),
  };

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
        <p className={styles.eyebrow}>Docs</p>
        <h1>What’s New</h1>
        <p className={styles.lead}>
          Public changelog for the desktop app. Every release should list{' '}
          <strong>Added</strong>, <strong>Fixed</strong>, <strong>Changed</strong>, and{' '}
          <strong>Removed</strong>. Managed from Admin → Releases (or seed scripts).
        </p>
        <div className={styles.links}>
          <Link href="/#compare">Free vs Pro</Link>
          <Link href="/#download">Download</Link>
          <Link href="/releases">Installers history</Link>
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
        {releases.map((rel) => (
          <article
            key={rel._id || rel.version}
            id={`v${String(rel.version).replace(/^v/i, '')}`}
            className={styles.card}
          >
            <div className={styles.cardHead}>
              <h2>v{String(rel.version).replace(/^v/i, '')}</h2>
              <div className={styles.meta}>
                {rel.isHome ? (
                  <span className={styles.badgeHome}>Latest / Home</span>
                ) : null}
                {rel.isOutdated ? (
                  <span className={styles.badgeOld}>Outdated</span>
                ) : null}
                {rel.publishedAt ? (
                  <time dateTime={String(rel.publishedAt).slice(0, 10)}>
                    {formatDate(rel.publishedAt)}
                  </time>
                ) : null}
              </div>
            </div>
            {rel.title ? <p className={styles.title}>{rel.title}</p> : null}
            {rel.notes ? <p className={styles.notes}>{rel.notes}</p> : null}

            <div className={styles.sections}>
              <Section title="Added" items={rel.added} className={styles.secAdded} />
              <Section title="Fixed" items={rel.fixed} className={styles.secFixed} />
              <Section
                title="Changed"
                items={rel.changed}
                className={styles.secChanged}
              />
              <Section
                title="Removed"
                items={rel.removed}
                className={styles.secRemoved}
              />
              <Section
                title="Notes"
                items={rel.changelog}
                className={styles.secNotes}
              />
            </div>

            {!rel.added?.length &&
            !rel.fixed?.length &&
            !rel.changed?.length &&
            !rel.removed?.length &&
            !rel.changelog?.length ? (
              <p className={styles.emptyNotes}>
                No structured notes yet for this version. Admin can add them under
                Releases.
              </p>
            ) : null}
          </article>
        ))}
      </main>
    </div>
  );
}
