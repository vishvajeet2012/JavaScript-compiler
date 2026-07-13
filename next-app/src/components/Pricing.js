'use client';

import { useEffect, useState } from 'react';
import styles from './Pricing.module.css';
import { getPlans, purchaseKey } from '@/lib/api';

function money(amount, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${currency} ${amount}`;
  }
}

function durationLabel(days) {
  if (!days || days <= 0) return 'Lifetime';
  if (days === 30) return '30 days';
  if (days === 365) return '1 year';
  return `${days} days`;
}

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getPlans();
        const list = res?.data || [];
        if (!cancelled) {
          setPlans(list);
          if (list[0]) setSelectedId(list[0].id || list[0]._id);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Could not load plans. Is the API running?');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = plans.find((p) => (p.id || p._id) === selectedId);

  const onBuy = async (e) => {
    e.preventDefault();
    setFormError('');
    setResult(null);
    setCopied(false);

    if (!selectedId) {
      setFormError('Select a plan');
      return;
    }
    if (!name.trim() || !email.trim()) {
      setFormError('Name and email are required');
      return;
    }

    setBusy(true);
    try {
      const res = await purchaseKey({
        planId: selectedId,
        name: name.trim(),
        email: email.trim(),
      });
      setResult(res.data);
    } catch (err) {
      setFormError(err.message || 'Purchase failed');
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!result?.licenseKey) return;
    try {
      await navigator.clipboard.writeText(result.licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFormError('Copy failed — select the key manually');
    }
  };

  return (
    <section id="pricing" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Pro licenses</p>
          <h2 className={styles.title}>Buy an activation key</h2>
          <p className={styles.subtitle}>
            Choose a plan, complete checkout, and get a license key instantly. Activate it in the
            desktop app under <strong>Activate Pro</strong>.
          </p>
        </div>

        {loading && <p className={styles.muted}>Loading plans…</p>}
        {error && !loading && <p className={styles.error}>{error}</p>}

        {!loading && !error && (
          <div className={styles.grid}>
            <div className={styles.plans}>
              {plans.map((p) => {
                const id = p.id || p._id;
                const active = id === selectedId;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`${styles.planCard} ${active ? styles.planActive : ''}`}
                    onClick={() => setSelectedId(id)}
                  >
                    <div className={styles.planTop}>
                      <h3>{p.name}</h3>
                      <span className={styles.price}>{money(p.price, p.currency)}</span>
                    </div>
                    <p className={styles.planMeta}>
                      {durationLabel(p.durationDays)} · {p.maxDevices} device
                      {p.maxDevices > 1 ? 's' : ''}
                      {p.oneTime ? ' · one-time key' : ''}
                    </p>
                    {p.description ? <p className={styles.planDesc}>{p.description}</p> : null}
                    <ul className={styles.features}>
                      {(p.features || []).map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className={styles.checkout}>
              <h3>Checkout</h3>
              {selected && (
                <p className={styles.selectedLine}>
                  Selected: <strong>{selected.name}</strong> —{' '}
                  {money(selected.price, selected.currency)}
                </p>
              )}

              {!result ? (
                <form onSubmit={onBuy} className={styles.form}>
                  <label className={styles.field}>
                    <span>Full name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                      autoComplete="name"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                      autoComplete="email"
                    />
                  </label>
                  <p className={styles.demoNote}>
                    Demo checkout — payment is simulated. Your license key is saved in MongoDB and
                    shown instantly.
                  </p>
                  {formError && <p className={styles.error}>{formError}</p>}
                  <button className={styles.buyBtn} type="submit" disabled={busy || !selectedId}>
                    {busy ? 'Processing…' : 'Buy key now'}
                  </button>
                </form>
              ) : (
                <div className={styles.success}>
                  <p className={styles.successTitle}>✓ Purchase complete</p>
                  <p className={styles.muted}>
                    Order <code>{result.orderId}</code>
                  </p>
                  <p className={styles.keyLabel}>Your license key</p>
                  <div className={styles.keyBox}>
                    <code>{result.licenseKey}</code>
                    <button type="button" className={styles.copyBtn} onClick={copyKey}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <ol className={styles.steps}>
                    <li>Open JS Compiler desktop app</li>
                    <li>Click <strong>Activate Pro</strong></li>
                    <li>Paste this key and activate online</li>
                  </ol>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => {
                      setResult(null);
                      setFormError('');
                    }}
                  >
                    Buy another key
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
