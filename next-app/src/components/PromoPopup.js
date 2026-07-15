'use client';

import { useEffect, useState } from 'react';
import styles from './PromoPopup.module.css';
import { FALLBACK_API_URL, FALLBACK_PROMO } from '@/lib/fallback';

const DISMISS_KEY = 'jsplay-promo-dismiss-v1';

export default function PromoPopup() {
  const [promo, setPromo] = useState(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const until = Number(dismissed);
        if (Number.isFinite(until) && Date.now() < until) return;
      }
    } catch {
      /* ignore */
    }

    const base =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || FALLBACK_API_URL;

    (async () => {
      let data = null;
      try {
        const res = await fetch(`${base}/api/v1/promo`, { cache: 'no-store' });
        const body = await res.json();
        if (body?.success && body.data) data = body.data;
      } catch {
        /* offline */
      }

      if (!data && FALLBACK_PROMO?.active) {
        const showUntil = new Date(FALLBACK_PROMO.showUntil).getTime();
        if (Date.now() <= showUntil) data = FALLBACK_PROMO;
      }

      if (!data) return;
      const showUntil = new Date(data.showUntil || 0).getTime();
      if (Number.isFinite(showUntil) && Date.now() > showUntil) return;

      setPromo(data);
      setOpen(true);
    })();
  }, []);

  if (!open || !promo) return null;

  const key =
    promo.sampleKey ||
    (Array.isArray(promo.keys) && promo.keys[0]) ||
    FALLBACK_PROMO?.sampleKey ||
    '';

  const dismiss = () => {
    setOpen(false);
    try {
      // Remember dismiss for 3 days
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    } catch {
      /* ignore */
    }
  };

  const copyKey = async () => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Promo">
      <div className={styles.modal}>
        <button type="button" className={styles.close} onClick={dismiss} aria-label="Close">
          ×
        </button>
        <p className={styles.eyebrow}>Limited launch promo · 2 months on site</p>
        <h2 className={styles.title}>{promo.title || 'Free Pro key'}</h2>
        <p className={styles.body}>
          {promo.message ||
            'Activate JS Compiler Pro free. Key works until 1 January 2028.'}
        </p>
        <div className={styles.keyBox}>
          <code>{key || '— ask admin for keys —'}</code>
          <button type="button" className={styles.copyBtn} onClick={copyKey} disabled={!key}>
            {copied ? 'Copied!' : 'Copy key'}
          </button>
        </div>
        <p className={styles.meta}>
          Key expires:{' '}
          <strong>
            {promo.keyExpiresAt
              ? new Date(promo.keyExpiresAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '1 January 2028'}
          </strong>
        </p>
        <ol className={styles.steps}>
          <li>Download JS Compiler for your OS</li>
          <li>Open app → Activate Pro</li>
          <li>Paste this key and activate</li>
        </ol>
        <div className={styles.actions}>
          <a className={styles.primary} href="#download" onClick={dismiss}>
            Download app
          </a>
          <button type="button" className={styles.secondary} onClick={dismiss}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
