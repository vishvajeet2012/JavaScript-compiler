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
  if (days === 7) return '7 days trial';
  if (days === 30) return '30 days';
  if (days === 365) return '1 year';
  return `${days} days`;
}

function planTypeLabel(type) {
  switch (type) {
    case 'student':
      return 'Student';
    case 'trial':
      return 'Trial';
    case 'team':
      return 'Team / Batch';
    default:
      return 'Pro';
  }
}

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [batchName, setBatchName] = useState('');
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
  const needsStudent = Boolean(selected?.requiresStudentId || selected?.planType === 'student');
  const isTeam = selected?.planType === 'team';

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
    if (needsStudent) {
      if (!studentId.trim() || studentId.trim().length < 4) {
        setFormError('Valid college / student ID is required');
        return;
      }
      if (!collegeName.trim()) {
        setFormError('College / institute name is required');
        return;
      }
    }

    setBusy(true);
    try {
      const res = await purchaseKey({
        planId: selectedId,
        name: name.trim(),
        email: email.trim(),
        studentId: needsStudent ? studentId.trim() : undefined,
        collegeName: needsStudent ? collegeName.trim() : undefined,
        batchName: isTeam ? batchName.trim() || name.trim() : undefined,
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
          <p className={styles.eyebrow}>Pro licenses · vishvajeetshukla.in</p>
          <h2 className={styles.title}>Buy an activation key</h2>
          <p className={styles.subtitle}>
            Trial, Student (college ID), Monthly / Yearly, Lifetime, or Team batch for coaching classes.
            Activate the key in the desktop app under <strong>Activate Pro</strong>.
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
                      <h3>
                        {p.name}
                        <span className={styles.typePill}>{planTypeLabel(p.planType)}</span>
                      </h3>
                      <span className={styles.price}>
                        {money(p.price, p.currency)}
                        {p.originalPrice ? (
                          <span className={styles.strike}>{money(p.originalPrice, p.currency)}</span>
                        ) : null}
                      </span>
                    </div>
                    <p className={styles.planMeta}>
                      {durationLabel(p.durationDays)} · {p.maxDevices} device
                      {p.maxDevices > 1 ? 's' : ''}
                      {p.oneTime ? ' · one-time key' : ''}
                      {p.planType === 'team' ? ` · ${p.seats || p.maxDevices} seats` : ''}
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
                  {needsStudent ? ' · Student ID required' : ''}
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

                  {needsStudent && (
                    <>
                      <label className={styles.field}>
                        <span>College / Student ID *</span>
                        <input
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="e.g. STU2024-12345"
                          required
                        />
                      </label>
                      <label className={styles.field}>
                        <span>College / Institute *</span>
                        <input
                          value={collegeName}
                          onChange={(e) => setCollegeName(e.target.value)}
                          placeholder="College name"
                          required
                        />
                      </label>
                    </>
                  )}

                  {isTeam && (
                    <label className={styles.field}>
                      <span>Batch / class name</span>
                      <input
                        value={batchName}
                        onChange={(e) => setBatchName(e.target.value)}
                        placeholder="e.g. JS Coaching Batch A"
                      />
                    </label>
                  )}

                  <p className={styles.demoNote}>
                    Demo checkout — payment is simulated. License key is issued instantly (saved in
                    MongoDB). Student plans store your ID for verification.
                  </p>
                  {formError && <p className={styles.error}>{formError}</p>}
                  <button className={styles.buyBtn} type="submit" disabled={busy || !selectedId}>
                    {busy
                      ? 'Processing…'
                      : selected?.price === 0
                        ? 'Get free trial key'
                        : 'Buy key now'}
                  </button>
                </form>
              ) : (
                <div className={styles.success}>
                  <p className={styles.successTitle}>✓ Purchase complete</p>
                  <p className={styles.muted}>
                    Order <code>{result.orderId}</code>
                    {result.plan?.maxDevices
                      ? ` · up to ${result.plan.maxDevices} device(s)`
                      : ''}
                    {result.expiresAt
                      ? ` · expires ${new Date(result.expiresAt).toLocaleDateString()}`
                      : result.plan?.durationDays === 0
                        ? ' · lifetime'
                        : ''}
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
                    <li>
                      Click <strong>Activate Pro</strong>
                    </li>
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
