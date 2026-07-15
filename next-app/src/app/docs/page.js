import Link from 'next/link';
import styles from '../changelog/changelog.module.css';

export const metadata = {
  title: 'Docs | JS Compiler',
  description:
    'Documentation hub for JS Compiler — What’s New changelog, Free vs Pro, downloads.',
  alternates: { canonical: '/docs' },
};

const LINKS = [
  {
    href: '/changelog',
    title: 'What’s New / Changelog',
    desc: 'Public release notes — Added, Fixed, Changed, Removed for every version.',
  },
  {
    href: '/#compare',
    title: 'Free vs Pro',
    desc: 'Feature comparison table for Free and Pro plans.',
  },
  {
    href: '/#download',
    title: 'Download',
    desc: 'Latest installers for Windows, Linux, and macOS.',
  },
  {
    href: '/releases',
    title: 'Installer history',
    desc: 'Older / outdated release installers.',
  },
  {
    href: '/jsplay',
    title: 'JS Play',
    desc: 'Free online JavaScript playground in the browser.',
  },
  {
    href: '/#pricing',
    title: 'Pricing',
    desc: 'Trial, Student, Pro, and Team plans.',
  },
];

export default function DocsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
        <p className={styles.eyebrow}>Docs</p>
        <h1>Documentation</h1>
        <p className={styles.lead}>
          Product docs for JS Compiler. Changelog updates on every release (strict
          agent rule).
        </p>
      </header>
      <main className={styles.main}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={styles.card}>
            <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.35rem' }}>{l.title}</h2>
            <p className={styles.notes}>{l.desc}</p>
          </Link>
        ))}
      </main>
    </div>
  );
}
