/**
 * Fetch admin broadcast message for desktop UI.
 * Production API hardcoded fallback.
 */

const DEFAULT_SERVER = "https://java-script-server.vercel.app";

function serverBase() {
  try {
    return require("./activation").getServerUrl().replace(/\/$/, "");
  } catch {
    return DEFAULT_SERVER;
  }
}

/**
 * @returns {Promise<null | { title: string, body: string, type: string, ctaLabel?: string, ctaUrl?: string }>}
 */
async function fetchActiveAnnouncement() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${serverBase()}/api/v1/announcement`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const body = await res.json();
    if (!body?.success || !body.data) return null;
    return body.data;
  } catch {
    clearTimeout(t);
    return null;
  }
}

/**
 * Structured release notes for version (admin-managed).
 */
async function fetchReleaseNotes(version) {
  if (!version) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    let url;
    if (String(version).toLowerCase() === "home") {
      // Home managed release (isHome)
      const homeRes = await fetch(`${serverBase()}/api/v1/releases/home`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!homeRes.ok) {
        clearTimeout(t);
        return null;
      }
      const homeBody = await homeRes.json();
      const first = Array.isArray(homeBody?.data) ? homeBody.data[0] : null;
      clearTimeout(t);
      if (!first) return null;
      return {
        version: String(first.version || "").replace(/^v/i, ""),
        title: first.title,
        notes: first.notes,
        changelog: first.changelog || [],
        added: first.added || [],
        fixed: first.fixed || [],
        changed: first.changed || [],
        removed: first.removed || [],
        publishedAt: first.publishedAt,
      };
    }
    const v = String(version).replace(/^v/i, "");
    url = `${serverBase()}/api/v1/releases/notes/${encodeURIComponent(v)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const body = await res.json();
    if (!body?.success || !body.data) return null;
    return body.data;
  } catch {
    clearTimeout(t);
    return null;
  }
}

function formatNotesDetail(notes) {
  if (!notes) return "";
  const lines = [];
  lines.push(`Version ${notes.version}${notes.title ? ` — ${notes.title}` : ""}`);
  if (notes.notes) lines.push(notes.notes);
  const sections = [
    ["Added", notes.added],
    ["Fixed", notes.fixed],
    ["Changed", notes.changed],
    ["Removed", notes.removed],
  ];
  for (const [label, items] of sections) {
    if (Array.isArray(items) && items.length) {
      lines.push(`\n${label}:`);
      items.forEach((i) => lines.push(`  • ${i}`));
    }
  }
  if (Array.isArray(notes.changelog) && notes.changelog.length) {
    lines.push("\nChangelog:");
    notes.changelog.forEach((i) => lines.push(`  • ${i}`));
  }
  return lines.join("\n").slice(0, 1800);
}

module.exports = {
  fetchActiveAnnouncement,
  fetchReleaseNotes,
  formatNotesDetail,
  DEFAULT_SERVER,
};
