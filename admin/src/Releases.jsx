import { useEffect, useState } from 'react';
import { api } from './api';

const PLATFORM_PRESETS = [
  { id: 'windows', name: 'Windows', arch: 'x64', label: 'Download for Windows' },
  { id: 'linux', name: 'Linux', arch: 'x64 · AppImage', label: 'Download AppImage' },
  { id: 'linux-deb', name: 'Linux', arch: 'x64 · .deb', label: 'Download .deb' },
  { id: 'mac-arm64', name: 'macOS', arch: 'Apple Silicon', label: 'Download for Mac (Apple Silicon)' },
  { id: 'mac-x64', name: 'macOS', arch: 'Intel', label: 'Download for Mac (Intel)' },
];

function emptyForm() {
  return {
    version: '',
    title: '',
    notes: '',
    isHome: true,
    isOutdated: false,
    isPublished: true,
    changelogText: '',
  };
}

export default function Releases({ showToast }) {
  const [releases, setReleases] = useState([]);
  const [r2Configured, setR2Configured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [upload, setUpload] = useState({
    releaseId: '',
    platformId: 'windows',
    file: null,
    progress: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listReleases();
      setReleases(res.data?.releases || []);
      setR2Configured(Boolean(res.data?.r2Configured));
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

  const createRelease = async (e) => {
    e.preventDefault();
    try {
      const changelog = form.changelogText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.createRelease({
        version: form.version,
        title: form.title || `JS Compiler v${form.version}`,
        notes: form.notes,
        isHome: form.isHome,
        isOutdated: form.isOutdated,
        isPublished: form.isPublished,
        changelog,
        platforms: [],
      });
      showToast?.('Release created');
      setForm(emptyForm());
      load();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const patch = async (id, body, msg = 'Updated') => {
    try {
      await api.updateRelease(id, body);
      showToast?.(msg);
      load();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const remove = async (id, version) => {
    if (!confirm(`Delete release ${version}?`)) return;
    try {
      await api.deleteRelease(id);
      showToast?.('Deleted');
      load();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const saveUrlPlatform = async (releaseId, preset, downloadUrl, fileName) => {
    try {
      await api.upsertReleasePlatform(releaseId, {
        ...preset,
        downloadUrl,
        fileName: fileName || '',
      });
      showToast?.('Platform URL saved');
      load();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const uploadToR2 = async (e) => {
    e.preventDefault();
    const { releaseId, platformId, file } = upload;
    if (!releaseId || !file) {
      showToast?.('Pick release + file', 'error');
      return;
    }
    const preset =
      PLATFORM_PRESETS.find((p) => p.id === platformId) || {
        id: platformId,
        name: platformId,
        label: platformId,
      };

    try {
      setUpload((u) => ({ ...u, progress: 'Requesting upload URL…' }));
      const presign = await api.presignReleaseUpload(releaseId, {
        platformId,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
      });
      const { uploadUrl, key } = presign.data || {};
      if (!uploadUrl || !key) throw new Error('Presign failed');

      setUpload((u) => ({ ...u, progress: 'Uploading to R2…' }));
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });
      if (!put.ok) {
        throw new Error(`R2 upload failed (${put.status})`);
      }

      setUpload((u) => ({ ...u, progress: 'Attaching to release…' }));
      await api.confirmReleaseUpload(releaseId, {
        platformId,
        r2Key: key,
        fileName: file.name,
        name: preset.name,
        arch: preset.arch,
        label: preset.label,
        size: file.size,
        note: 'Hosted on Cloudflare R2',
      });

      showToast?.('Uploaded to R2 & attached');
      setUpload({ releaseId: '', platformId: 'windows', file: null, progress: '' });
      load();
    } catch (err) {
      showToast?.(err.message, 'error');
      setUpload((u) => ({ ...u, progress: '' }));
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h2>Releases</h2>
          <p>
            Manage installers for Next.js home (<code>isHome</code>) and history page.
            R2: {r2Configured ? 'configured ✅' : 'not configured on API ⚠️ (URL paste still works)'}
          </p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h3>Create release</h3>
        </div>
        <form className="form-grid" onSubmit={createRelease}>
          <label>
            Version *
            <input
              required
              placeholder="1.0.2"
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
            />
          </label>
          <label>
            Title
            <input
              placeholder="JS Compiler v1.0.2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="full">
            Notes
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <label className="full">
            Changelog (one line per item)
            <textarea
              rows={3}
              value={form.changelogText}
              onChange={(e) => setForm({ ...form, changelogText: e.target.value })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.isHome}
              onChange={(e) => setForm({ ...form, isHome: e.target.checked })}
            />
            isHome — show on Next.js home download section
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.isOutdated}
              onChange={(e) => setForm({ ...form, isOutdated: e.target.checked })}
            />
            isOutdated — history page only
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            />
            Published (public API)
          </label>
          <div className="form-actions full">
            <button className="btn btn-primary" type="submit">
              Create release
            </button>
          </div>
        </form>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h3>Upload installer → R2</h3>
        </div>
        <form className="form-grid" onSubmit={uploadToR2}>
          <label>
            Release
            <select
              value={upload.releaseId}
              onChange={(e) => setUpload({ ...upload, releaseId: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {releases.map((r) => (
                <option key={r._id} value={r._id}>
                  v{r.version} {r.isHome ? '(home)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Platform
            <select
              value={upload.platformId}
              onChange={(e) => setUpload({ ...upload, platformId: e.target.value })}
            >
              {PLATFORM_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Installer file
            <input
              type="file"
              onChange={(e) =>
                setUpload({ ...upload, file: e.target.files?.[0] || null })
              }
            />
          </label>
          {upload.progress ? (
            <p className="full" style={{ color: 'var(--muted, #888)' }}>
              {upload.progress}
            </p>
          ) : null}
          <div className="form-actions full">
            <button className="btn btn-primary" type="submit" disabled={!r2Configured}>
              Upload to R2
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>All releases ({releases.length})</h3>
        </div>
        {releases.length === 0 ? (
          <div className="empty">No releases yet. Create one and attach installers.</div>
        ) : (
          releases.map((r) => (
            <div
              key={r._id}
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '1rem 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <strong>v{r.version}</strong>
                <span className="badge">{r.title}</span>
                {r.isHome ? (
                  <span className="badge" style={{ color: '#86efac' }}>
                    HOME
                  </span>
                ) : null}
                {r.isOutdated ? (
                  <span className="badge" style={{ color: '#fca5a5' }}>
                    OUTDATED
                  </span>
                ) : null}
                {!r.isPublished ? (
                  <span className="badge">UNPUBLISHED</span>
                ) : null}
                <span style={{ flex: 1 }} />
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() =>
                    patch(r._id, { isHome: true, isOutdated: false }, 'Set as home')
                  }
                >
                  Set isHome
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() =>
                    patch(
                      r._id,
                      { isOutdated: true, isHome: false },
                      'Moved to history',
                    )
                  }
                >
                  Mark outdated
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => remove(r._id, r.version)}
                >
                  Delete
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>File</th>
                      <th>URL / R2</th>
                      <th>Attach URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLATFORM_PRESETS.map((preset) => {
                      const existing = (r.platforms || []).find(
                        (p) => p.id === preset.id,
                      );
                      return (
                        <tr key={preset.id}>
                          <td>{preset.id}</td>
                          <td>{existing?.fileName || '—'}</td>
                          <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>
                            {existing?.r2Key ? (
                              <code>r2:{existing.r2Key}</code>
                            ) : existing?.downloadUrl ? (
                              <a
                                href={existing.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                link
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <UrlAttachRow
                              onSave={(url, fileName) =>
                                saveUrlPlatform(r._id, preset, url, fileName)
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function UrlAttachRow({ onSave }) {
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <input
        style={{ minWidth: 140 }}
        placeholder="https://… or GitHub asset"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <input
        style={{ width: 120 }}
        placeholder="file name"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
      />
      <button
        className="btn btn-secondary"
        type="button"
        onClick={() => {
          if (!url.trim()) return;
          onSave(url.trim(), fileName.trim());
          setUrl('');
          setFileName('');
        }}
      >
        Save
      </button>
    </div>
  );
}
