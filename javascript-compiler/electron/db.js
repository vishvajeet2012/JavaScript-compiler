const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");
const fs = require("fs");

let db = null;

function getDbPath() {
  const dir = path.join(app.getPath("userData"), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "compiler.db");
}

function migrate(database) {
  const cols = database.pragma("table_info(snippets)").map((c) => c.name);
  if (!cols.includes("folder_id")) {
    database.exec("ALTER TABLE snippets ADD COLUMN folder_id INTEGER REFERENCES folders(id)");
  }
}

function initDb() {
  if (db) return db;

  db = new Database(getDbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      language TEXT DEFAULT 'javascript',
      folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activation (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      is_pro INTEGER DEFAULT 0,
      activation_key TEXT,
      machine_id TEXT,
      activated_at TEXT,
      last_verified TEXT,
      token TEXT
    );

    INSERT OR IGNORE INTO activation (id, is_pro) VALUES (1, 0);
  `);

  migrate(db);
  return db;
}

// ── Folders ───────────────────────────────────────────────

function getFolders() {
  return initDb().prepare("SELECT * FROM folders ORDER BY name ASC").all();
}

function createFolder({ name, parentId = null }) {
  const result = initDb()
    .prepare("INSERT INTO folders (name, parent_id) VALUES (?, ?)")
    .run(name, parentId);
  return result.lastInsertRowid;
}

function renameFolder(id, name) {
  initDb().prepare("UPDATE folders SET name=? WHERE id=?").run(name, id);
}

function isDescendant(database, ancestorId, folderId) {
  let current = folderId;
  const seen = new Set();
  while (current != null) {
    if (current === ancestorId) return true;
    if (seen.has(current)) break;
    seen.add(current);
    const row = database.prepare("SELECT parent_id FROM folders WHERE id=?").get(current);
    current = row ? row.parent_id : null;
  }
  return false;
}

function moveFolder(id, parentId) {
  if (id === parentId) throw new Error("Cannot move folder into itself");
  const database = initDb();
  if (parentId != null && isDescendant(database, id, parentId)) {
    throw new Error("Cannot move folder into its own subfolder");
  }
  database.prepare("UPDATE folders SET parent_id=? WHERE id=?").run(parentId, id);
}

function deleteFolder(id) {
  const database = initDb();
  database.prepare("UPDATE snippets SET folder_id=NULL WHERE folder_id=?").run(id);
  database.prepare("UPDATE folders SET parent_id=NULL WHERE parent_id=?").run(id);
  database.prepare("DELETE FROM folders WHERE id=?").run(id);
}

// ── Snippets ──────────────────────────────────────────────

function getSnippets() {
  return initDb().prepare("SELECT * FROM snippets ORDER BY updated_at DESC").all();
}

function getSnippetCount() {
  return initDb().prepare("SELECT COUNT(*) as count FROM snippets").get().count;
}

function saveSnippet({ id, title, code, language = "javascript", folderId = null }) {
  const database = initDb();
  if (id) {
    database.prepare(
      "UPDATE snippets SET title=?, code=?, language=?, folder_id=?, updated_at=datetime('now') WHERE id=?"
    ).run(title, code, language, folderId, id);
    return id;
  }
  const result = database.prepare(
    "INSERT INTO snippets (title, code, language, folder_id) VALUES (?, ?, ?, ?)"
  ).run(title, code, language, folderId);
  return result.lastInsertRowid;
}

function moveSnippet(id, folderId) {
  initDb().prepare("UPDATE snippets SET folder_id=? WHERE id=?").run(folderId, id);
}

function deleteSnippet(id) {
  initDb().prepare("DELETE FROM snippets WHERE id=?").run(id);
}

// ── Settings & Activation ─────────────────────────────────

function getSetting(key, fallback = null) {
  const row = initDb().prepare("SELECT value FROM settings WHERE key=?").get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  initDb().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).run(key, value);
}

function getActivation() {
  return initDb().prepare("SELECT * FROM activation WHERE id=1").get();
}

function saveActivation({ isPro, activationKey, machineId, token }) {
  initDb().prepare(`
    UPDATE activation SET
      is_pro=?, activation_key=?, machine_id=?,
      activated_at=datetime('now'), last_verified=datetime('now'), token=?
    WHERE id=1
  `).run(isPro ? 1 : 0, activationKey, machineId, token);
}

function clearActivation() {
  initDb().prepare(`
    UPDATE activation SET is_pro=0, activation_key=NULL, machine_id=NULL,
      activated_at=NULL, last_verified=NULL, token=NULL WHERE id=1
  `).run();
  try {
    setSetting("license_expires_at", "");
  } catch {
    /* ignore */
  }
}

const DEFAULT_SETTINGS = {
  auto_save_enabled: "true",
  auto_save_interval: "30",
  execution_timeout: "5",
  editor_theme: "vs-dark",
  activation_server: "http://localhost:5000",
};

function getAllSettings() {
  const database = initDb();
  const result = { ...DEFAULT_SETTINGS };
  const rows = database.prepare("SELECT key, value FROM settings").all();
  rows.forEach((r) => { result[r.key] = r.value; });
  return result;
}

function saveSettings(settings) {
  Object.entries(settings).forEach(([key, value]) => setSetting(key, String(value)));
}

function saveDraft({ title, code, folderId }) {
  setSetting("draft_title", title || "untitled.js");
  setSetting("draft_code", code || "");
  setSetting("draft_folder_id", folderId != null ? String(folderId) : "");
  setSetting("draft_saved_at", new Date().toISOString());
}

function getDraft() {
  const code = getSetting("draft_code");
  if (!code) return null;
  const folderRaw = getSetting("draft_folder_id");
  return {
    title: getSetting("draft_title", "untitled.js"),
    code,
    folderId: folderRaw ? parseInt(folderRaw, 10) : null,
    savedAt: getSetting("draft_saved_at"),
  };
}

function clearDraft() {
  ["draft_title", "draft_code", "draft_folder_id", "draft_saved_at"].forEach((k) => {
    initDb().prepare("DELETE FROM settings WHERE key=?").run(k);
  });
}

module.exports = {
  initDb,
  getFolders,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  getSnippets,
  getSnippetCount,
  saveSnippet,
  moveSnippet,
  deleteSnippet,
  getSetting,
  setSetting,
  getActivation,
  saveActivation,
  clearActivation,
  getAllSettings,
  saveSettings,
  saveDraft,
  getDraft,
  clearDraft,
};