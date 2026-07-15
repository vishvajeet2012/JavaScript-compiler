import { useEffect, useMemo, useState } from 'react';
import { api, hasToken, setToken } from './api';
import Releases from './Releases';
import Messages from './Messages';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'releases', label: 'Releases' },
  { id: 'messages', label: 'Messages & Promo' },
  { id: 'usage', label: 'Usage Analytics' },
  { id: 'crashes', label: 'Crash Reports' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'orders', label: 'Orders' },
  { id: 'keys', label: 'License Keys' },
  { id: 'generate', label: 'Generate Keys' },
];

function formatDate(value) {
  if (!value) return 'Lifetime';
  return new Date(value).toLocaleString();
}

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

export default function App() {
  const [authed, setAuthed] = useState(hasToken());
  const [tab, setTab] = useState('dashboard');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [toast, setToast] = useState(null);

  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);

  const [keyFilter, setKeyFilter] = useState({ status: '', q: '' });
  const [generated, setGenerated] = useState([]);
  const [usageOverview, setUsageOverview] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceQuery, setDeviceQuery] = useState('');
  const [crashes, setCrashes] = useState([]);
  const [crashStats, setCrashStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderQuery, setOrderQuery] = useState('');
  const [downloadStats, setDownloadStats] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const logout = () => {
    setToken('');
    setAuthed(false);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, p, k, u, d, cs, cl, o, dl] = await Promise.all([
        api.stats(),
        api.listPlans(),
        api.listKeys(keyFilter.status || keyFilter.q ? keyFilter : {}),
        api.usageOverview().catch(() => ({ data: null })),
        api.usageDevices({ q: deviceQuery || undefined }).catch(() => ({ data: [] })),
        api.crashStats().catch(() => ({ data: null })),
        api.listCrashes().catch(() => ({ data: [] })),
        api.listOrders().catch(() => ({ data: [] })),
        api.downloadStats().catch(() => ({ data: null })),
      ]);
      setStats(s.data);
      setPlans(p.data || []);
      setKeys(k.data || []);
      setUsageOverview(u.data);
      setDevices(d.data || []);
      setCrashStats(cs.data);
      setCrashes(cl.data || []);
      setOrders(o.data || []);
      setDownloadStats(dl.data);
    } catch (err) {
      if (err.status === 401) logout();
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await api.login(password);
      setToken(res.data.token);
      setAuthed(true);
      setPassword('');
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    }
  };

  if (!authed) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="brand-mark">JS</div>
          <h1>Admin Panel</h1>
          <p>Manage pricing plans and generate license keys for JS Compiler.</p>
          <div className="field">
            <label>Admin password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter ADMIN_SECRET"
              autoFocus
              required
            />
          </div>
          {loginError && <p className="error-text">{loginError}</p>}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
              Sign in
            </button>
          </div>
          <p className="muted" style={{ marginTop: '1rem' }}>
            Default password: <span className="mono">admin123</span>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="brand-mark" style={{ width: 40, height: 40, margin: 0 }}>
            JS
          </div>
          <div>
            <strong>JS Compiler</strong>
            <span>Admin · v1.0</span>
          </div>
        </div>
        <nav className="nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-secondary" type="button" onClick={loadAll} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh data'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={logout} style={{ marginTop: 8 }}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        {tab === 'dashboard' && (
          <Dashboard
            stats={stats}
            plans={plans}
            keys={keys}
            usage={usageOverview}
            orders={orders}
            downloadStats={downloadStats}
            onSeed={async (force = false) => {
              try {
                const res = await api.seed(force);
                showToast(res.message);
                loadAll();
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
          />
        )}
        {tab === 'releases' && <Releases showToast={showToast} />}
        {tab === 'messages' && <Messages showToast={showToast} />}
        {tab === 'usage' && (
          <UsageAnalytics
            overview={usageOverview}
            devices={devices}
            selectedDevice={selectedDevice}
            deviceQuery={deviceQuery}
            setDeviceQuery={setDeviceQuery}
            onSearch={async () => {
              try {
                const d = await api.usageDevices({ q: deviceQuery || undefined });
                setDevices(d.data || []);
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
            onSelect={async (machineId) => {
              try {
                const res = await api.usageDevice(machineId);
                setSelectedDevice(res.data);
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
            onCloseDetail={() => setSelectedDevice(null)}
            onRefresh={loadAll}
            toast={showToast}
            onProtect={async (machineId, patch) => {
              try {
                await api.setDeviceProtection(machineId, patch);
                showToast('Protection updated — app will enforce within ~3 min');
                const res = await api.usageDevice(machineId);
                setSelectedDevice(res.data);
                const d = await api.usageDevices({ q: deviceQuery || undefined });
                setDevices(d.data || []);
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
          />
        )}
        {tab === 'crashes' && (
          <Crashes
            stats={crashStats}
            crashes={crashes}
            onRefresh={async () => {
              try {
                const [cs, cl] = await Promise.all([api.crashStats(), api.listCrashes()]);
                setCrashStats(cs.data);
                setCrashes(cl.data || []);
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
            onDelete={async (id) => {
              try {
                await api.deleteCrash(id);
                showToast('Crash deleted');
                const [cs, cl] = await Promise.all([api.crashStats(), api.listCrashes()]);
                setCrashStats(cs.data);
                setCrashes(cl.data || []);
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
          />
        )}
        {tab === 'pricing' && (
          <Pricing
            plans={plans}
            onChange={loadAll}
            toast={showToast}
          />
        )}
        {tab === 'orders' && (
          <Orders
            orders={orders}
            query={orderQuery}
            setQuery={setOrderQuery}
            toast={showToast}
            onReload={async () => {
              try {
                const o = await api.listOrders(orderQuery ? { q: orderQuery } : {});
                setOrders(o.data || []);
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
          />
        )}
        {tab === 'keys' && (
          <Keys
            keys={keys}
            plans={plans}
            filter={keyFilter}
            setFilter={setKeyFilter}
            toast={showToast}
            onReload={async () => {
              try {
                const k = await api.listKeys(keyFilter);
                setKeys(k.data || []);
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
            onRevoke={async (id) => {
              try {
                await api.revokeKey(id);
                showToast('Key revoked');
                loadAll();
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
            onBulkRevoke={async (body) => {
              try {
                const res = await api.revokeKeysBulk(body);
                showToast(res.message || `${res.data?.revoked || 0} key(s) revoked`);
                loadAll();
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
            onDelete={async (id) => {
              if (!confirm('Delete this key permanently?')) return;
              try {
                await api.deleteKey(id);
                showToast('Key deleted');
                loadAll();
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
          />
        )}
        {tab === 'generate' && (
          <Generate
            plans={plans.filter((p) => p.active !== false)}
            generated={generated}
            setGenerated={setGenerated}
            toast={showToast}
            onDone={loadAll}
          />
        )}
      </main>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

function Dashboard({ stats, plans, keys, usage, orders = [], downloadStats = null, onSeed }) {
  const recent = useMemo(() => keys.slice(0, 8), [keys]);
  return (
    <>
      <div className="topbar">
        <div>
          <h2>Dashboard</h2>
          <p>Plans (Trial / Student / Team), keys, orders — publisher: vishvajeetshukla.in</p>
        </div>
        <div className="form-actions" style={{ margin: 0 }}>
          <button className="btn btn-secondary" type="button" onClick={() => onSeed(false)}>
            Sync missing plans
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              if (confirm('Force-reset default plan prices/features from seed? Custom edits on those codes will be overwritten.')) {
                onSeed(true);
              }
            }}
          >
            Force reseed defaults
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <Stat label="Plans" value={stats?.plans ?? '—'} />
        <Stat label="Total keys" value={stats?.totalKeys ?? '—'} />
        <Stat label="Active keys" value={stats?.activeKeys ?? '—'} />
        <Stat label="Orders" value={orders?.length ?? '—'} />
        <Stat label="Total downloads" value={downloadStats?.total ?? '—'} />
        <Stat label="Downloads today" value={downloadStats?.today ?? '—'} />
        <Stat label="Devices tracked" value={usage?.devices ?? '—'} />
        <Stat label="Total app time" value={usage?.totalDurationHuman ?? '—'} />
        <Stat label="Code runs" value={usage?.totalRuns ?? '—'} />
        <Stat label="Pro users" value={usage?.proUsers ?? '—'} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Pricing plans ({plans.length})</h3>
        </div>
        {plans.length === 0 ? (
          <div className="empty">No plans yet. Click “Sync missing plans” or create one.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Devices / seats</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.name}</strong>
                      <div className="muted mono">{p.code}</div>
                    </td>
                    <td>
                      <span className="badge badge-plan">{p.planType || 'standard'}</span>
                    </td>
                    <td>
                      {money(p.price, p.currency)}
                      {p.originalPrice ? (
                        <div className="muted" style={{ textDecoration: 'line-through' }}>
                          {money(p.originalPrice, p.currency)}
                        </div>
                      ) : null}
                    </td>
                    <td>{p.durationDays ? `${p.durationDays} days` : 'Lifetime'}</td>
                    <td>
                      {p.maxDevices}
                      {p.seats && p.seats !== p.maxDevices ? ` · seats ${p.seats}` : ''}
                    </td>
                    <td>
                      {p.oneTime ? 'One-time · ' : ''}
                      {p.requiresStudentId ? 'Student ID' : p.planType === 'team' ? 'Team' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Recent keys</h3>
        {recent.length === 0 ? (
          <div className="empty">No keys generated yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Plan</th>
                  <th>Devices</th>
                  <th>Expires</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((k) => (
                  <tr key={k._id}>
                    <td className="mono">{k.key}</td>
                    <td>{k.planName}</td>
                    <td>
                      {k.devicesUsed ?? k.devices?.length ?? 0}/{k.maxDevices}
                    </td>
                    <td>{formatDate(k.expiresAt)}</td>
                    <td>
                      <span className={`badge badge-${k.status}`}>{k.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function Pricing({ plans, onChange, toast }) {
  const empty = {
    name: '',
    code: '',
    price: 199,
    originalPrice: '',
    currency: 'INR',
    durationDays: 30,
    maxDevices: 1,
    seats: 1,
    oneTime: false,
    planType: 'standard',
    requiresStudentId: false,
    description: '',
    features: '',
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createPlan({
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice === '' ? null : Number(form.originalPrice),
        durationDays: Number(form.durationDays),
        maxDevices: Number(form.maxDevices),
        seats: Number(form.seats) || Number(form.maxDevices) || 1,
        requiresStudentId: form.planType === 'student' ? true : Boolean(form.requiresStudentId),
        features: form.features
          ? String(form.features)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      });
      toast('Plan created');
      setForm(empty);
      onChange();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan) => {
    try {
      await api.updatePlan(plan._id, { active: !plan.active });
      toast(plan.active ? 'Plan disabled' : 'Plan enabled');
      onChange();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (plan) => {
    if (!confirm(`Delete plan “${plan.name}”?`)) return;
    try {
      await api.deletePlan(plan._id);
      toast('Plan deleted');
      onChange();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Pricing plans</h2>
          <p>
            Standard · Student (ID required) · Trial (7-day) · Team (coaching batch seats). Duration + device limits
            are enforced on activation.
          </p>
        </div>
      </div>

      <div className="panel">
        <h3>Create plan</h3>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Pro Monthly"
              />
            </div>
            <div className="field">
              <label>Code</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="PRO_MONTHLY"
              />
            </div>
            <div className="field">
              <label>Plan type</label>
              <select
                value={form.planType}
                onChange={(e) => {
                  const planType = e.target.value;
                  setForm({
                    ...form,
                    planType,
                    requiresStudentId: planType === 'student',
                    oneTime: planType === 'trial' ? true : form.oneTime,
                  });
                }}
              >
                <option value="standard">Standard</option>
                <option value="student">Student (discount + ID)</option>
                <option value="trial">Trial (7-day style)</option>
                <option value="team">Team / Batch (coaching)</option>
              </select>
            </div>
            <div className="field">
              <label>Price</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Original price (strike, optional)</label>
              <input
                type="number"
                min="0"
                value={form.originalPrice}
                onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                placeholder="For student discount display"
              />
            </div>
            <div className="field">
              <label>Currency</label>
              <input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="field">
              <label>Duration (days, 0 = lifetime)</label>
              <input
                type="number"
                min="0"
                value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Max devices (license seats)</label>
              <input
                type="number"
                min="1"
                value={form.maxDevices}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxDevices: e.target.value,
                    seats: e.target.value,
                  })
                }
              />
            </div>
            <div className="field">
              <label>Advertised seats</label>
              <input
                type="number"
                min="1"
                value={form.seats}
                onChange={(e) => setForm({ ...form, seats: e.target.value })}
              />
            </div>
            <div className="field-check">
              <input
                id="oneTimePlan"
                type="checkbox"
                checked={form.oneTime}
                onChange={(e) => setForm({ ...form, oneTime: e.target.checked })}
              />
              <label htmlFor="oneTimePlan">One-time key (single device use)</label>
            </div>
            <div className="field-check">
              <input
                id="requiresStudentId"
                type="checkbox"
                checked={form.requiresStudentId || form.planType === 'student'}
                onChange={(e) => setForm({ ...form, requiresStudentId: e.target.checked })}
              />
              <label htmlFor="requiresStudentId">Require college / student ID at purchase</label>
            </div>
            <div className="field full">
              <label>Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="field full">
              <label>Features (comma separated)</label>
              <input
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder="Unlimited snippets, Export, Version history, 2 devices"
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Create plan'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h3>All plans</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Type</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Devices</th>
                <th>Flags</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p._id}>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="muted mono">{p.code}</div>
                    {p.description && <div className="muted">{p.description}</div>}
                  </td>
                  <td>
                    <span className="badge badge-plan">{p.planType || 'standard'}</span>
                  </td>
                  <td>
                    {money(p.price, p.currency)}
                    {p.originalPrice ? (
                      <div className="muted" style={{ textDecoration: 'line-through' }}>
                        {money(p.originalPrice, p.currency)}
                      </div>
                    ) : null}
                  </td>
                  <td>{p.durationDays ? `${p.durationDays}d` : 'Lifetime'}</td>
                  <td>{p.maxDevices}</td>
                  <td>
                    {p.oneTime ? 'One-time' : 'Multi'}
                    {p.requiresStudentId ? ' · Student ID' : ''}
                    {p.planType === 'team' ? ' · Team' : ''}
                  </td>
                  <td>
                    <span className={`badge ${p.active ? 'badge-active' : 'badge-revoked'}`}>
                      {p.active ? 'active' : 'off'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => toggleActive(p)}>
                        {p.active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => remove(p)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Keys({ keys, plans, filter, setFilter, onReload, onRevoke, onBulkRevoke, onDelete, toast }) {
  const [selected, setSelected] = useState(() => new Set());
  const [bulkNote, setBulkNote] = useState('');
  const [bulkPlanId, setBulkPlanId] = useState('');
  const [bulkReason, setBulkReason] = useState('refund');

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === keys.length) setSelected(new Set());
    else setSelected(new Set(keys.map((k) => k._id)));
  };

  const revokeSelected = () => {
    if (!selected.size) {
      toast?.('Select at least one key', 'error');
      return;
    }
    if (!confirm(`Revoke ${selected.size} selected key(s)?`)) return;
    onBulkRevoke({ ids: [...selected], reason: bulkReason || 'bulk_selected' });
    setSelected(new Set());
  };

  const revokeByNote = () => {
    if (!bulkNote.trim()) {
      toast?.('Enter order/note text (e.g. Order #123)', 'error');
      return;
    }
    if (!confirm(`Revoke all keys matching note “${bulkNote.trim()}”?`)) return;
    onBulkRevoke({ note: bulkNote.trim(), reason: bulkReason || 'refund' });
  };

  const revokeByPlan = () => {
    if (!bulkPlanId) {
      toast?.('Select a plan', 'error');
      return;
    }
    if (!confirm('Revoke ALL active keys for this plan?')) return;
    onBulkRevoke({ planId: bulkPlanId, reason: bulkReason || 'plan_revoke' });
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h2>License keys</h2>
          <p>Track devices, expiry, and bulk-revoke for refunds / orders.</p>
        </div>
      </div>

      <div className="panel">
        <h3>Bulk revoke (refunds / orders)</h3>
        <div className="form-grid">
          <div className="field">
            <label>Reason tag</label>
            <input
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder="refund / chargeback / order-123"
            />
          </div>
          <div className="field">
            <label>Match note (order id)</label>
            <input
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              placeholder="Order #123"
            />
          </div>
          <div className="field">
            <label>Or revoke by plan</label>
            <select value={bulkPlanId} onChange={(e) => setBulkPlanId(e.target.value)}>
              <option value="">Select plan…</option>
              {(plans || []).map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-danger" type="button" onClick={revokeSelected}>
            Revoke selected ({selected.size})
          </button>
          <button className="btn btn-secondary" type="button" onClick={revokeByNote}>
            Revoke by note / order
          </button>
          <button className="btn btn-secondary" type="button" onClick={revokeByPlan}>
            Revoke by plan
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="filters">
          <input
            placeholder="Search key / plan / note"
            value={filter.q}
            onChange={(e) => setFilter({ ...filter, q: e.target.value })}
          />
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
          <button className="btn btn-secondary" type="button" onClick={onReload}>
            Apply
          </button>
        </div>

        {keys.length === 0 ? (
          <div className="empty">No keys found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selected.size === keys.length && keys.length > 0}
                      onChange={toggleAll}
                      title="Select all"
                    />
                  </th>
                  <th>Key</th>
                  <th>Plan / price</th>
                  <th>Devices</th>
                  <th>Expiry</th>
                  <th>Flags</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(k._id)}
                        onChange={() => toggle(k._id)}
                        disabled={k.status === 'revoked'}
                      />
                    </td>
                    <td>
                      <div className="mono">{k.key}</div>
                      {k.note && <div className="muted">{k.note}</div>}
                      <div className="muted">Created {formatDate(k.createdAt)}</div>
                    </td>
                    <td>
                      <span className="badge badge-plan">{k.planName}</span>
                      <div className="muted">{money(k.price, k.currency)}</div>
                    </td>
                    <td>
                      <strong>
                        {k.devicesUsed ?? k.devices?.length ?? 0}/{k.maxDevices}
                      </strong>
                      {(k.devices || []).slice(0, 3).map((d) => (
                        <div key={d.machineId} className="device-list mono">
                          {String(d.machineId).slice(0, 12)}…
                        </div>
                      ))}
                    </td>
                    <td>{formatDate(k.expiresAt)}</td>
                    <td>
                      {k.oneTime ? 'One-time' : 'Multi'}
                    </td>
                    <td>
                      <span className={`badge badge-${k.isExpired ? 'expired' : k.status}`}>
                        {k.isExpired ? 'expired' : k.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          onClick={() => navigator.clipboard.writeText(k.key)}
                        >
                          Copy
                        </button>
                        {k.status !== 'revoked' && (
                          <button className="btn btn-danger btn-sm" type="button" onClick={() => onRevoke(k._id)}>
                            Revoke
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => onDelete(k._id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Crashes({ stats, crashes, onRefresh, onDelete }) {
  return (
    <>
      <div className="topbar">
        <div>
          <h2>Crash reports</h2>
          <p>Silent reports from the desktop app (uncaught errors + native crashes). Users never see this.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <Stat label="Total" value={stats?.total ?? '—'} />
        <Stat label="Last 24h" value={stats?.last24h ?? '—'} />
        <Stat
          label="Types"
          value={
            stats?.byType
              ? Object.entries(stats.byType)
                  .map(([k, v]) => `${k}:${v}`)
                  .join(' · ') || '—'
              : '—'
          }
        />
      </div>

      <div className="panel">
        {crashes.length === 0 ? (
          <div className="empty">No crash reports yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Device / version</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {crashes.map((c) => (
                  <tr key={c._id}>
                    <td>{formatDate(c.receivedAt || c.createdAt)}</td>
                    <td>
                      <span className="badge badge-plan">{c.type}</span>
                    </td>
                    <td>
                      <div>{c.message}</div>
                      {c.stack && (
                        <pre className="muted mono" style={{ whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto', marginTop: 4, fontSize: 11 }}>
                          {String(c.stack).slice(0, 400)}
                        </pre>
                      )}
                    </td>
                    <td>
                      <div className="mono muted">{c.machineId ? `${String(c.machineId).slice(0, 12)}…` : '—'}</div>
                      <div className="muted">
                        v{c.appVersion || '?'} · {c.platform}/{c.arch}
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => onDelete(c._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function UsageAnalytics({
  overview,
  devices,
  selectedDevice,
  deviceQuery,
  setDeviceQuery,
  onSearch,
  onSelect,
  onCloseDetail,
  onRefresh,
  onProtect,
}) {
  return (
    <>
      <div className="topbar">
        <div>
          <h2>Usage analytics</h2>
          <p>
            Silent telemetry + system protection. Block a device to force-quit the desktop app
            (checked every ~3 min). Users never see admin controls.
          </p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <Stat label="Devices" value={overview?.devices ?? '—'} />
        <Stat label="Pro / Free" value={`${overview?.proUsers ?? 0} / ${overview?.freeUsers ?? 0}`} />
        <Stat label="Sessions" value={overview?.totalSessions ?? '—'} />
        <Stat label="Total open time" value={overview?.totalDurationHuman ?? '—'} />
        <Stat label="Active time" value={overview?.totalActiveHuman ?? '—'} />
        <Stat label="Runs" value={overview?.totalRuns ?? '—'} />
        <Stat label="Saves" value={overview?.totalSaves ?? '—'} />
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Devices</h3>
        </div>
        <div className="filters">
          <input
            placeholder="Search machine / hostname / key"
            value={deviceQuery}
            onChange={(e) => setDeviceQuery(e.target.value)}
          />
          <button className="btn btn-secondary" type="button" onClick={onSearch}>
            Search
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="empty">
            No usage data yet. Open the Electron app (even offline) — it will sync when the server is reachable.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Plan</th>
                  <th>Protection</th>
                  <th>Open time</th>
                  <th>Active time</th>
                  <th>Runs / Saves</th>
                  <th>Last seen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.machineId}>
                    <td>
                      <div className="mono">{String(d.machineId).slice(0, 16)}…</div>
                      <div className="muted">
                        {d.hostname || '—'} · {d.platform}/{d.arch} · v{d.appVersion || '?'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${d.isPro ? 'badge-active' : 'badge-revoked'}`}>
                        {d.isPro ? 'PRO' : 'FREE'}
                      </span>
                    </td>
                    <td>
                      {d.blocked || d.forceQuit ? (
                        <span className="badge badge-revoked">BLOCKED</span>
                      ) : (
                        <span className="badge badge-active">OK</span>
                      )}
                    </td>
                    <td>{d.totalDurationHuman || '0s'}</td>
                    <td>{d.totalActiveHuman || '0s'}</td>
                    <td>
                      {d.totalRuns || 0} / {d.totalSaves || 0}
                    </td>
                    <td>{formatDate(d.lastSeenAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-secondary btn-sm" type="button" onClick={() => onSelect(d.machineId)}>
                          Details
                        </button>
                        {d.blocked || d.forceQuit ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            type="button"
                            onClick={() => onProtect(d.machineId, { blocked: false, forceQuit: false, blockReason: '' })}
                          >
                            Unblock
                          </button>
                        ) : (
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            onClick={() => {
                              const reason = prompt('Block reason (shown if app opens online):', 'Blocked by admin') || 'Blocked by admin';
                              onProtect(d.machineId, { blocked: true, forceQuit: true, blockReason: reason });
                            }}
                          >
                            Block & quit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedDevice && (
        <div className="panel">
          <div className="panel-header">
            <h3>Device detail</h3>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onCloseDetail}>
              Close
            </button>
          </div>
          <div className="muted mono" style={{ marginBottom: '0.75rem' }}>
            {selectedDevice.machineId}
          </div>
          <div className="stats-grid">
            <Stat label="Open time" value={selectedDevice.totalDurationHuman} />
            <Stat label="Active time" value={selectedDevice.totalActiveHuman} />
            <Stat label="Sessions" value={selectedDevice.totalSessions} />
            <Stat label="Snippets" value={selectedDevice.snippetCount} />
          </div>

          <div className="panel" style={{ marginTop: '1rem', background: 'var(--bg2)' }}>
            <h3>System protection</h3>
            <p className="muted" style={{ marginBottom: '0.75rem' }}>
              Status:{' '}
              <strong>
                {selectedDevice.blocked || selectedDevice.forceQuit ? 'BLOCKED (force quit)' : 'Allowed'}
              </strong>
              {selectedDevice.blockReason ? ` — ${selectedDevice.blockReason}` : ''}
            </p>
            <div className="form-actions">
              <button
                className="btn btn-danger"
                type="button"
                onClick={() =>
                  onProtect(selectedDevice.machineId, {
                    blocked: true,
                    forceQuit: true,
                    blockReason: prompt('Reason:', selectedDevice.blockReason || 'Blocked by admin') || 'Blocked by admin',
                  })
                }
              >
                Block device (auto close app)
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() =>
                  onProtect(selectedDevice.machineId, {
                    revokePro: true,
                    blockReason: 'Pro revoked by admin',
                  })
                }
              >
                Revoke Pro only
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() =>
                  onProtect(selectedDevice.machineId, {
                    blocked: false,
                    forceQuit: false,
                    revokePro: false,
                    blockReason: '',
                  })
                }
              >
                Unblock / restore
              </button>
            </div>
          </div>

          <h3 style={{ margin: '1rem 0 0.5rem' }}>Recent sessions</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Ended</th>
                  <th>Duration</th>
                  <th>Active</th>
                  <th>Runs</th>
                  <th>Saves</th>
                </tr>
              </thead>
              <tbody>
                {(selectedDevice.sessions || []).map((s) => (
                  <tr key={s.sessionId}>
                    <td>{formatDate(s.startedAt)}</td>
                    <td>{s.endedAt ? formatDate(s.endedAt) : 'open'}</td>
                    <td>{s.durationHuman}</td>
                    <td>{s.activeHuman}</td>
                    <td>{s.runCount}</td>
                    <td>{s.saveCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ margin: '1rem 0 0.5rem' }}>Recent events</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {(selectedDevice.events || []).slice(0, 50).map((e) => (
                  <tr key={e.eventId}>
                    <td>{formatDate(e.createdAt)}</td>
                    <td>
                      <span className="badge badge-plan">{e.type}</span>
                    </td>
                    <td className="mono muted">
                      {e.payload ? JSON.stringify(e.payload).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function Orders({ orders, query, setQuery, onReload, toast }) {
  return (
    <>
      <div className="topbar">
        <div>
          <h2>Orders</h2>
          <p>Website purchases — student ID, college, team batch details (demo checkout).</p>
        </div>
      </div>
      <div className="panel">
        <div className="filters">
          <input
            placeholder="Search order / email / student ID / batch / key"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-secondary" type="button" onClick={onReload}>
            Search
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="empty">No orders yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Student / batch</th>
                  <th>Key</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id || o.orderId}>
                    <td>
                      <div className="mono">{o.orderId}</div>
                      <div className="muted">{formatDate(o.createdAt)}</div>
                      <div className="muted">{money(o.price, o.currency)}</div>
                    </td>
                    <td>
                      <strong>{o.customerName}</strong>
                      <div className="muted">{o.customerEmail}</div>
                    </td>
                    <td>
                      <span className="badge badge-plan">{o.planName}</span>
                      <div className="muted mono">{o.planCode}</div>
                    </td>
                    <td>
                      {o.studentId ? (
                        <>
                          <div>ID: {o.studentId}</div>
                          <div className="muted">{o.collegeName || '—'}</div>
                        </>
                      ) : null}
                      {o.batchName ? (
                        <div>
                          Batch: {o.batchName}
                          {o.seats ? ` · ${o.seats} seats` : ''}
                        </div>
                      ) : null}
                      {!o.studentId && !o.batchName ? '—' : null}
                    </td>
                    <td>
                      {o.licenseKey ? (
                        <button
                          className="btn btn-secondary btn-sm mono"
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(o.licenseKey);
                            toast?.('Key copied');
                          }}
                        >
                          {o.licenseKey}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${o.status === 'paid' ? 'active' : o.status}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Generate({ plans, generated, setGenerated, toast, onDone }) {
  const [form, setForm] = useState({
    planId: '',
    count: 1,
    maxDevices: '',
    oneTime: '',
    expiresAt: '',
    note: '',
    prefix: '',
    batchName: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.planId && plans[0]) {
      setForm((f) => ({ ...f, planId: plans[0]._id }));
    }
  }, [plans, form.planId]);

  const selected = plans.find((p) => p._id === form.planId);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.planId) {
      toast('Select a pricing plan', 'error');
      return;
    }
    setBusy(true);
    try {
      const body = {
        planId: form.planId,
        count: Number(form.count) || 1,
        note: form.note,
      };
      if (form.maxDevices !== '') body.maxDevices = Number(form.maxDevices);
      if (form.oneTime !== '') body.oneTime = form.oneTime === 'true';
      if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();
      if (form.prefix) body.prefix = form.prefix;
      if (form.batchName.trim()) body.batchName = form.batchName.trim();

      const res = await api.generateKeys(body);
      setGenerated(res.data || []);
      toast(res.message || 'Keys generated');
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Generate keys</h2>
          <p>
            Trial / Student / Team plans supported. For coaching classes: pick Team plan, set batch name, generate
            many seat keys (up to 200) or use a multi-device master key.
          </p>
        </div>
      </div>

      <div className="panel">
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label>Pricing plan</label>
              <select
                required
                value={form.planId}
                onChange={(e) => setForm({ ...form, planId: e.target.value })}
              >
                <option value="" disabled>
                  Select plan
                </option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    [{p.planType || 'standard'}] {p.name} · {money(p.price, p.currency)} ·{' '}
                    {p.durationDays ? `${p.durationDays}d` : 'lifetime'} · {p.maxDevices} device(s)
                    {p.oneTime ? ' · one-time' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>How many keys {selected?.planType === 'team' ? '(batch seats, max 200)' : '(max 100)'}</label>
              <input
                type="number"
                min="1"
                max={selected?.planType === 'team' ? 200 : 100}
                value={form.count}
                onChange={(e) => setForm({ ...form, count: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Coaching batch name (optional)</label>
              <input
                value={form.batchName}
                onChange={(e) => setForm({ ...form, batchName: e.target.value })}
                placeholder="e.g. Class 12 JS Batch A"
              />
            </div>
            <div className="field">
              <label>Max devices (override)</label>
              <input
                type="number"
                min="1"
                placeholder={selected ? String(selected.maxDevices) : 'from plan'}
                value={form.maxDevices}
                onChange={(e) => setForm({ ...form, maxDevices: e.target.value })}
              />
            </div>
            <div className="field">
              <label>One-time (override)</label>
              <select
                value={form.oneTime}
                onChange={(e) => setForm({ ...form, oneTime: e.target.value })}
              >
                <option value="">Use plan default ({selected?.oneTime ? 'yes' : 'no'})</option>
                <option value="true">Yes — one device only forever</option>
                <option value="false">No — allow up to max devices</option>
              </select>
            </div>
            <div className="field">
              <label>Custom expiry (optional)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Key prefix (4 chars)</label>
              <input
                maxLength={4}
                placeholder={selected?.code?.slice(0, 4) || 'JSCP'}
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="field full">
              <label>Note (customer / order id)</label>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Order #123 / customer email"
              />
            </div>
          </div>

          {selected && (
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              Plan defaults → duration:{' '}
              <strong>{selected.durationDays ? `${selected.durationDays} days` : 'lifetime'}</strong>
              , devices: <strong>{selected.maxDevices}</strong>, one-time:{' '}
              <strong>{selected.oneTime ? 'yes' : 'no'}</strong>, price:{' '}
              <strong>{money(selected.price, selected.currency)}</strong>
            </p>
          )}

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy || !plans.length}>
              {busy ? 'Generating…' : 'Generate keys'}
            </button>
          </div>
        </form>

        {generated.length > 0 && (
          <div className="generated-keys">
            <h4>Generated ({generated.length}) — copy & share</h4>
            <ul>
              {generated.map((k) => (
                <li key={k._id || k.key}>
                  <span className="mono">{k.key}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(k.key);
                      toast('Copied');
                    }}
                  >
                    Copy
                  </button>
                </li>
              ))}
            </ul>
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  const text = generated.map((k) => k.key).join('\n');
                  navigator.clipboard.writeText(text);
                  toast('All keys copied');
                }}
              >
                Copy all
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
