'use client';

import { useEffect, useState } from 'react';
import styles from './PromoPopup.module.css';
import { FALLBACK_API_URL, FALLBACK_PROMO } from '@/lib/fallback';

const DISMISS_KEY = 'jsplay-promo-dismiss-v1';
const VISITOR_KEY = 'jsplay-promo-visitor-id';
const CLAIMED_KEY = 'jsplay-promo-claimed-key';

function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id || id.length < 12) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `v-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return `v-session-${Date.now()}`;
  }
}

export default function PromoPopup() {
  const [promo, setPromo] = useState(null);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(null);

  const base =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
      : FALLBACK_API_URL;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const until = Number(dismissed);
        if (Number.isFinite(until) && Date.now() < until) return;
      }
      const cached = localStorage.getItem(CLAIMED_KEY);
      if (cached) setKey(cached);
    } catch {
      /* ignore */
    }

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
        if (Date.now() <= showUntil) {
          data = {
            ...FALLBACK_PROMO,
            claimRequired: true,
            keysRemaining: FALLBACK_PROMO.keys?.length ?? null,
          };
        }
      }

      if (!data) return;
      const showUntil = new Date(data.showUntil || 0).getTime();
      if (Number.isFinite(showUntil) && Date.now() > showUntil) return;

      setPromo(data);
      if (typeof data.keysRemaining === 'number') setRemaining(data.keysRemaining);
      setOpen(true);
    })();
  }, [base]);

  const claim = async () => {
    if (key) return;
    setBusy(true);
    setError('');
    try {
      const visitorId = getVisitorId();
      const res = await fetch(`${base}/api/v1/promo/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-visitor-id': visitorId,
        },
        body: JSON.stringify({
          visitorId,
          offerCode: promo?.code || FALLBACK_PROMO.code,
        }),
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        // Offline fallback: rotate local key once per visitor
        if (FALLBACK_PROMO.keys?.length) {
          const fallbackKey = FALLBACK_PROMO.keys[0];
          setKey(fallbackKey);
          try {
            localStorage.setItem(CLAIMED_KEY, fallbackKey);
          } catch {
            /* ignore */
          }
          setError('');
          return;
        }
        throw new Error(body?.message || 'Could not claim key');
      }
      const claimed = body.data?.key || '';
      setKey(claimed);
      try {
        localStorage.setItem(CLAIMED_KEY, claimed);
      } catch {
        /* ignore */
      }
      if (typeof remaining === 'number' && !body.data?.alreadyClaimed) {
        setRemaining(Math.max(0, remaining - 1));
      }
    } catch (e) {
      setError(e.message || 'Claim failed');
    } finally {
      setBusy(false);
    }
  };

  if (!open || !promo) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + 3 * 24 * 60 * 60 * 1000),
      );
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
            'Activate JS Compiler Pro free. Key works until 1 January 2028. One key per visitor.'}
        </p>

        {typeof remaining === 'number' ? (
          <p className={styles.meta}>
            Keys left in pool: <strong>{remaining}</strong>
          </p>
        ) : null}

        <div className={styles.keyBox}>
          <code>{key || 'Claim a key to reveal…'}</code>
          {key ? (
            <button type="button" className={styles.copyBtn} onClick={copyKey}>
              {copied ? 'Copied!' : 'Copy key'}
            </button>
          ) : (
            <button
              type="button"
              className={styles.copyBtn}
              onClick={claim}
              disabled={busy}
            >
              {busy ? 'Claiming…' : 'Claim free key'}
            </button>
          )}
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}

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
          {' · '}
          1 key per browser (visitor)
        </p>
        <ol className={styles.steps}>
          <li>Claim & copy your unique key</li>
          <li>Download JS Compiler</li>
          <li>App → Activate Pro → paste key</li>
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
