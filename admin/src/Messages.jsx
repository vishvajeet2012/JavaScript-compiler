import { useEffect, useState } from 'react';
import { api } from './api';

export default function Messages({ showToast }) {
  const [announcements, setAnnouncements] = useState([]);
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'promo',
    active: true,
  });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        api.listAnnouncements(),
        api.listPromos(),
      ]);
      setAnnouncements(a.data || []);
      setPromos(p.data || []);
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createMsg = async (e) => {
    e.preventDefault();
    try {
      await api.createAnnouncement(form);
      showToast?.('Desktop message created — app will show it on next launch/check');
      setForm({ title: '', body: '', type: 'promo', active: true });
      load();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Messages & Promo</h2>
          <p>
            Desktop banner messages + website free-key promo. Keys expire 1 Jan 2028 for launch promo.
          </p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h3>New desktop message (shows in software banner)</h3>
        </div>
        <form className="form-grid" onSubmit={createMsg}>
          <label className="full">
            Title
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="full">
            Body
            <textarea
              required
              rows={3}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </label>
          <label>
            Type
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="info">info</option>
              <option value="promo">promo</option>
              <option value="warning">warning</option>
              <option value="success">success</option>
            </select>
          </label>
          <div className="form-actions full">
            <button className="btn btn-primary" type="submit">
              Publish message
            </button>
          </div>
        </form>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h3>Active / past desktop messages</h3>
        </div>
        {announcements.length === 0 ? (
          <div className="empty">No messages yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((m) => (
                  <tr key={m._id}>
                    <td>
                      <strong>{m.title}</strong>
                      <div style={{ fontSize: 12, color: '#888' }}>{m.body}</div>
                    </td>
                    <td>{m.type}</td>
                    <td>{m.active ? 'yes' : 'no'}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={async () => {
                          await api.updateAnnouncement(m._id, { active: !m.active });
                          load();
                        }}
                      >
                        Toggle
                      </button>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={async () => {
                          if (!confirm('Delete?')) return;
                          await api.deleteAnnouncement(m._id);
                          load();
                        }}
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Website promo offers</h3>
        </div>
        {promos.length === 0 ? (
          <div className="empty">
            No promos. Run <code>node scripts/generate-promo-keys.js</code> in /server.
          </div>
        ) : (
          promos.map((p) => (
            <div key={p._id} style={{ padding: '0.75rem 0', borderTop: '1px solid #222' }}>
              <strong>{p.title}</strong> · <code>{p.code}</code>
              <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>{p.message}</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Keys: {(p.keys || []).length} · expires{' '}
                {p.keyExpiresAt ? new Date(p.keyExpiresAt).toLocaleDateString() : '—'} · show
                until {p.showUntil ? new Date(p.showUntil).toLocaleDateString() : '—'} ·{' '}
                {p.active ? 'ACTIVE' : 'off'}
              </div>
              <pre
                style={{
                  fontSize: 11,
                  marginTop: 8,
                  whiteSpace: 'pre-wrap',
                  color: '#c4b5fd',
                }}
              >
                {(p.keys || []).join('\n')}
              </pre>
            </div>
          ))
        )}
      </div>
    </>
  );
}
