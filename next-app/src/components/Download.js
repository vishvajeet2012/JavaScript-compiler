'use client';

import { useState } from 'react';
import styles from './Download.module.css';
import OsIcon from './OsIcon';

const defaults = {
  title: 'Download JS Compiler',
  subtitle: 'Free desktop app for Windows, Linux, and macOS.',
  version: 'latest',
  platforms: [],
  changelog: [],
  requirements: [],
};

function formatBytes(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '';
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(0)} KB`;
  return `${(num / 1024 / 1024).toFixed(1)} MB`;
}

function formatRetry(sec) {
  if (!sec || sec < 60) return `${sec || 0}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.ceil((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default function Download({ data }) {
  const d = { ...defaults, ...data };
  const platforms = d.platforms || [];
  const changelog = d.changelog || [];
  const requirements = d.requirements || [];
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const startAppDownload = async (platform) => {
    const href = platform.href || '/api/download';
    setBusyId(platform.id || platform.label);
    setError('');
    setInfo('');

    try {
      // Preflight: catch JSON errors (missing R2 env / rate limit) before redirect
      const pre = await fetch(href, {
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
      });

      // 302 → signed R2 URL (same-origin response, Location readable)
      if (pre.status >= 300 && pre.status < 400) {
        const location = pre.headers.get('Location');
        const remaining = pre.headers.get('X-Download-Remaining');
        if (remaining != null) {
          setInfo(
            `Download started. Remaining today for this network: ${remaining}`,
          );
        }
        if (location) {
          window.location.assign(location);
          return;
        }
        // Location hidden — still navigate; browser will follow 302
        window.location.assign(href);
        return;
      }

      // Opaque redirect (some browsers)
      if (pre.type === 'opaqueredirect' || pre.status === 0) {
        window.location.assign(href);
        return;
      }

      if (pre.status === 429) {
        const body = await pre.json().catch(() => ({}));
        const retry = body?.data?.retryAfterSec || body?.retryAfterSec;
        setError(
          body?.message ||
            `Download limit reached (5 per 24h). Try again in ${formatRetry(retry)}.`,
        );
        return;
      }

      if (!pre.ok) {
        const body = await pre.json().catch(() => ({}));
        setError(
          body?.message ||
            `Download failed (${pre.status}). If this is production, set R2 env vars on Vercel.`,
        );
        return;
      }

      const body = await pre.json().catch(() => null);
      if (body?.url) {
        window.location.assign(body.url);
        return;
      }

      window.location.assign(href);
    } catch {
      // Last resort: full navigation (works when fetch is blocked)
      window.location.assign(href);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section id="download" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Get the app</p>
          <h2 className={styles.title}>{d.title}</h2>
          <p className={styles.subtitle}>{d.subtitle}</p>
          <span className={styles.versionBadge}>v{d.version}</span>
        </div>

        {error ? (
          <p className={styles.errorBanner} role="alert">
            {error}
          </p>
        ) : null}
        {info ? <p className={styles.infoBanner}>{info}</p> : null}

        <div className={styles.grid}>
          <div className={styles.cards}>
            {platforms.map((p) => {
              const isAppDownload =
                typeof p.href === 'string' &&
                p.href.startsWith('/api/download');
              const busy = busyId === (p.id || p.label);
              const sizeLabel = formatBytes(p.size);
              const meta = [p.arch, sizeLabel].filter(Boolean).join(' · ');

              if (isAppDownload) {
                return (
                  <button
                    key={p.id || p.label}
                    type="button"
                    className={styles.card}
                    onClick={() => startAppDownload(p)}
                    disabled={Boolean(busyId)}
                  >
                    <div className={styles.cardTop}>
                      <OsIcon id={p.id} className={styles.osIcon} size={20} />
                      <div>
                        <h3>{p.name}</h3>
                        {meta ? <p className={styles.meta}>{meta}</p> : null}
                      </div>
                    </div>
                    <span className={styles.downloadBtn}>
                      {busy ? 'Preparing download…' : p.label}
                    </span>
                    {p.note ? <p className={styles.note}>{p.note}</p> : null}
                    {p.file ? (
                      <p className={styles.note}>{p.file}</p>
                    ) : null}
                  </button>
                );
              }

              return (
                <a
                  key={p.id || p.label}
                  href={p.href}
                  className={styles.card}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className={styles.cardTop}>
                    <OsIcon id={p.id} className={styles.osIcon} size={20} />
                    <div>
                      <h3>{p.name}</h3>
                      {meta ? <p className={styles.meta}>{meta}</p> : null}
                    </div>
                  </div>
                  <span className={styles.downloadBtn}>{p.label}</span>
                  {p.note ? <p className={styles.note}>{p.note}</p> : null}
                </a>
              );
            })}
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
