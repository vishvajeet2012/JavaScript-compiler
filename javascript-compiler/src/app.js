let editor = null;
let activeSnippetId = null;
let activeFolderId = null;
let activeLanguage = "javascript";
let isPro = false;
let proMeta = {};
let snippetLimit = 5;
let isRunning = false;
let isDirty = false;
let autoSaveTimer = null;
let settings = {};
let folders = [];
let snippets = [];
let templateFilter = "all";
const openFolders = new Set();

const ICONS = {
  js: "assets/icons/js.svg",
  folder: "assets/icons/folder-default.svg",
  folderJs: "assets/icons/folder-javascript.svg",
};

const LANG_EXT = {
  javascript: "js",
  typescript: "ts",
  html: "html",
  node: "js",
};

const MONACO_LANG = {
  javascript: "javascript",
  typescript: "typescript",
  html: "html",
  node: "javascript",
};

function iconImg(src, alt = "") {
  return `<img src="${src}" alt="${alt}" class="tree-icon-img" width="16" height="16" />`;
}

const DEFAULT_CODE = `// JavaScript Compiler — write & run code\nconsole.log('Hello World!');\n\nconst sum = (a, b) => a + b;\nconsole.log('2 + 3 =', sum(2, 3));`;

const TEMPLATES = [
  {
    name: "Hello World",
    desc: "Basic console output",
    language: "javascript",
    code: `// Hello World\nconsole.log('Hello, World!');\nconsole.log('Welcome to JS Compiler');`,
  },
  {
    name: "Variables & Types",
    desc: "let, const, typeof",
    language: "javascript",
    code: `let name = "Vishu";\nconst age = 25;\nlet items = [1, 2, 3];\n\nconsole.log(name, age);\nconsole.log(typeof name, typeof items);`,
  },
  {
    name: "Functions",
    desc: "Arrow & regular functions",
    language: "javascript",
    code: `function greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconst add = (a, b) => a + b;\n\nconsole.log(greet("Dev"));\nconsole.log(add(10, 20));`,
  },
  {
    name: "Array Methods",
    desc: "map, filter, reduce",
    language: "javascript",
    code: `const nums = [1, 2, 3, 4, 5];\n\nconst doubled = nums.map(n => n * 2);\nconst evens = nums.filter(n => n % 2 === 0);\nconst sum = nums.reduce((a, b) => a + b, 0);\n\nconsole.log("Doubled:", doubled);\nconsole.log("Evens:", evens);\nconsole.log("Sum:", sum);`,
  },
  {
    name: "Async / Await",
    desc: "Promise with delay",
    language: "javascript",
    code: `function delay(ms) {\n  return new Promise(resolve => setTimeout(resolve, ms));\n}\n\nasync function main() {\n  console.log("Start...");\n  await delay(1000);\n  console.log("Done after 1 second!");\n}\n\nmain();`,
  },
  {
    name: "Class OOP",
    desc: "ES6 class example",
    language: "javascript",
    code: `class Animal {\n  constructor(name) {\n    this.name = name;\n  }\n  speak() {\n    return \`\${this.name} makes a sound\`;\n  }\n}\n\nclass Dog extends Animal {\n  speak() { return \`\${this.name} barks!\`; }\n}\n\nconst d = new Dog("Rex");\nconsole.log(d.speak());`,
  },
  {
    name: "TS Interfaces",
    desc: "Types + interface (stripped at run)",
    language: "typescript",
    code: `interface User {\n  id: number;\n  name: string;\n  active?: boolean;\n}\n\nfunction greet(user: User): string {\n  return \`Hello, \${user.name} (#\${user.id})\`;\n}\n\nconst me: User = { id: 1, name: "Student", active: true };\nconsole.log(greet(me));\nconsole.log("Active:", me.active);`,
  },
  {
    name: "TS Generics",
    desc: "Generic helper function",
    language: "typescript",
    code: `function first<T>(arr: T[]): T | undefined {\n  return arr[0];\n}\n\nconst nums: number[] = [10, 20, 30];\nconst names: string[] = ["Asha", "Ravi"];\n\nconsole.log(first(nums));\nconsole.log(first(names));`,
  },
  {
    name: "HTML + Script",
    desc: "Markup with runnable script tags",
    language: "html",
    code: `<!DOCTYPE html>\n<html>\n<head><title>Demo</title></head>\n<body>\n  <h1>Hello HTML + JS</h1>\n  <p id="out">…</p>\n  <script>\n    const out = { text: "Rendered from <script>" };\n    console.log(out.text);\n    console.log("2 + 2 =", 2 + 2);\n  </script>\n</body>\n</html>`,
  },
  {
    name: "HTML Counter pattern",
    desc: "Logic pattern for UI counters",
    language: "html",
    code: `<div id="app">\n  <button id="btn">Count</button>\n  <span id="n">0</span>\n</div>\n<script>\n  let n = 0;\n  function click() {\n    n += 1;\n    console.log("Count:", n);\n  }\n  click(); click(); click();\n</script>`,
  },
  {
    name: "Node path / process",
    desc: "Node-style sandbox APIs",
    language: "node",
    code: `const path = require('path');\nconst os = require('os');\n\nconsole.log('platform:', process.platform);\nconsole.log('cwd:', process.cwd());\nconsole.log('join:', path.join('src', 'app.js'));\nconsole.log('home:', os.homedir());\nconsole.log('argv:', process.argv);`,
  },
  {
    name: "Node module.exports",
    desc: "CommonJS module pattern",
    language: "node",
    code: `function add(a, b) {\n  return a + b;\n}\n\nmodule.exports = { add };\n\nconst lib = module.exports;\nconsole.log('add(3,4) =', lib.add(3, 4));\nconsole.log('exports keys:', Object.keys(exports));`,
  },
  {
    name: "npm package (lodash)",
    desc: "Install lodash via npm bar, then require it",
    language: "node",
    code: `// 1) Language: Node (Pro)\n// 2) npm bar: type "lodash" → Install\n// 3) Run\n\nconst _ = require('lodash');\n\nconst nums = [1, 2, 3, 4, 5];\nconsole.log('sum', _.sum(nums));\nconsole.log('chunk', _.chunk(nums, 2));\nconsole.log('uniq', _.uniq([1, 1, 2, 3, 3]));\n`,
  },
];

require.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" },
});

require(["vs/editor/editor.main"], () => {
  editor = monaco.editor.create(document.getElementById("editor"), {
    value: DEFAULT_CODE,
    language: "javascript",
    theme: "vs-dark",
    fontSize: 14,
    fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 12 },
  });

  editor.onDidChangeModelContent(() => {
    isDirty = true;
    setAutoSaveStatus("");
  });

  init();
});

async function init() {
  settings = await window.compiler.getSettings();
  applyTheme(settings.editor_theme || "vs-dark");
  await refreshProStatus();
  await refreshWorkspace();
  await restoreDraftOrDefault();
  renderTemplates();
  startAutoSave();
  bindEvents();
  await initVersionAndUpdates();
  loadAdminAnnouncement();
  document.getElementById("machine-id").textContent =
    (await window.compiler.getMachineId()).slice(0, 16) + "...";
  setLanguageUI(activeLanguage);
}

const PRO_ONLY_LANGUAGES = new Set(["typescript", "html", "node"]);

function isProLanguage(lang) {
  return PRO_ONLY_LANGUAGES.has(String(lang || "").toLowerCase());
}

function setLanguageUI(lang, opts = {}) {
  let next = lang || "javascript";
  // Free plan cannot stay on Pro languages
  if (!isPro && isProLanguage(next)) {
    if (!opts.silent) {
      showToast(
        "TypeScript / HTML+JS / Node are Pro only. Activate Pro to unlock.",
        "error",
      );
    }
    next = "javascript";
  }
  activeLanguage = next;
  const sel = document.getElementById("file-language");
  if (sel) {
    sel.value = activeLanguage;
    updateLanguageSelectProState();
  }
  if (editor && monaco?.editor) {
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, MONACO_LANG[activeLanguage] || "javascript");
    }
  }
}

function updateLanguageSelectProState() {
  const sel = document.getElementById("file-language");
  if (!sel) return;
  Array.from(sel.options).forEach((opt) => {
    const pro = isProLanguage(opt.value);
    opt.disabled = pro && !isPro;
    // Keep labels clear
    if (opt.value === "typescript") {
      opt.textContent = isPro ? "TypeScript" : "TypeScript (Pro)";
    } else if (opt.value === "html") {
      opt.textContent = isPro ? "HTML + JS" : "HTML + JS (Pro)";
    } else if (opt.value === "node") {
      opt.textContent = isPro ? "Node" : "Node (Pro)";
    }
  });
  sel.title = isPro
    ? "Language mode"
    : "Free: JavaScript only · Pro: TypeScript, HTML+JS, Node";
  updateNpmBarVisibility();
}

function updateNpmBarVisibility() {
  const bar = document.getElementById("npm-bar");
  if (!bar) return;
  const show = isPro && currentLanguage() === "node";
  bar.classList.toggle("hidden", !show);
  if (show) refreshNpmPackages();
}

async function refreshNpmPackages() {
  const listEl = document.getElementById("npm-packages");
  const status = document.getElementById("npm-status");
  if (!listEl || !window.compiler?.npmList) return;
  try {
    const res = await window.compiler.npmList();
    listEl.innerHTML = "";
    (res.packages || []).forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "npm-chip";
      chip.innerHTML = `${esc(name)} <button type="button" title="Uninstall" data-pkg="${esc(name)}">×</button>`;
      chip.querySelector("button")?.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(`npm uninstall ${name}?`)) return;
        if (status) status.textContent = `Removing ${name}…`;
        const r = await window.compiler.npmRemove(name);
        if (status) status.textContent = r.ok ? `Removed ${name}` : r.error || "Failed";
        if (r.ok) showToast(`Removed ${name}`, "success");
        else showToast(r.error || "Uninstall failed", "error");
        refreshNpmPackages();
      });
      listEl.appendChild(chip);
    });
    if (status && !(status.textContent || "").includes("…")) {
      status.textContent = res.packages?.length
        ? `${res.packages.length} package(s)`
        : "No packages — install e.g. lodash";
    }
  } catch (e) {
    if (status) status.textContent = e.message || "npm list failed";
  }
}

async function installNpmPackage() {
  if (!isPro) {
    showToast("npm install is Pro (Node mode).", "error");
    openActivateModal();
    return;
  }
  if (currentLanguage() !== "node") {
    showToast("Switch language to Node to install packages.", "error");
    return;
  }
  const input = document.getElementById("npm-package-input");
  const status = document.getElementById("npm-status");
  const btn = document.getElementById("btn-npm-install");
  const spec = (input?.value || "").trim();
  if (!spec) {
    showToast("Enter a package name (e.g. lodash)", "error");
    return;
  }
  if (btn) btn.disabled = true;
  if (status) status.textContent = `npm install ${spec}…`;
  try {
    const res = await window.compiler.npmInstall(spec);
    if (res.ok) {
      showToast(res.message || `Installed ${spec}`, "success");
      if (input) input.value = "";
      if (status) status.textContent = res.message || "Installed";
      refreshNpmPackages();
    } else {
      showToast(res.error || "npm install failed", "error");
      if (status) status.textContent = res.error || "Failed";
    }
  } catch (e) {
    showToast(e.message || "npm install failed", "error");
    if (status) status.textContent = e.message || "Failed";
  } finally {
    if (btn) btn.disabled = false;
  }
}

function currentLanguage() {
  const sel = document.getElementById("file-language");
  const v = sel?.value || activeLanguage || "javascript";
  if (!isPro && isProLanguage(v)) return "javascript";
  return v;
}

function defaultFileName(lang) {
  const ext = LANG_EXT[lang] || "js";
  return `untitled.${ext}`;
}

function formatExpiry(expiresAt) {
  if (!expiresAt) return "Lifetime";
  try {
    return new Date(expiresAt).toLocaleString();
  } catch {
    return String(expiresAt);
  }
}

// ── Version + Auto-update ─────────────────────────────────

async function initVersionAndUpdates() {
  try {
    const version = await window.compiler.getAppVersion();
    document.getElementById("app-version").textContent = `v${version}`;
    document.getElementById("settings-version").textContent = `v${version}`;
    document.title = `JS Compiler v${version}`;

    const status = await window.compiler.getUpdateStatus();
    applyUpdateStatus(status);

    if (window.compiler.onUpdateStatus) {
      window.compiler.onUpdateStatus(applyUpdateStatus);
    }
  } catch (e) {
    console.warn("Version/update init failed:", e);
  }
}

function applyUpdateStatus(data) {
  if (!data) return;

  const versionEl = document.getElementById("app-version");
  const settingsVer = document.getElementById("settings-version");
  const titleStatus = document.getElementById("update-status");
  const settingsText = document.getElementById("settings-update-text");
  const progressWrap = document.getElementById("update-progress-wrap");
  const progressFill = document.getElementById("update-progress-fill");
  const progressLabel = document.getElementById("update-progress-label");
  const btnInstall = document.getElementById("btn-install-update");
  const btnCheck = document.getElementById("btn-check-update");

  if (data.currentVersion) {
    if (versionEl) versionEl.textContent = `v${data.currentVersion}`;
    if (settingsVer) settingsVer.textContent = `v${data.currentVersion}`;
  }

  let titleMsg = "";
  let titleClass = "update-status";
  let settingsMsg = "Up to date";

  switch (data.status) {
    case "checking":
      titleMsg = "Checking updates…";
      settingsMsg = "Checking for updates…";
      if (btnCheck) btnCheck.disabled = true;
      if (progressWrap) progressWrap.classList.add("hidden");
      if (btnInstall) btnInstall.classList.add("hidden");
      break;
    case "available":
      titleMsg = `Update ${data.availableVersion}`;
      titleClass += " update-warn";
      settingsMsg = `Version ${data.availableVersion} found — downloading…`;
      if (btnCheck) btnCheck.disabled = true;
      break;
    case "downloading": {
      const pct = data.progress?.percent ?? 0;
      titleMsg = `Downloading ${pct}%`;
      titleClass += " update-warn";
      settingsMsg = `Downloading update… ${pct}%`;
      if (progressWrap) progressWrap.classList.remove("hidden");
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressLabel) progressLabel.textContent = `${pct}%`;
      if (btnCheck) btnCheck.disabled = true;
      break;
    }
    case "downloaded":
      titleMsg = "Update ready";
      titleClass += " update-ok";
      settingsMsg = `v${data.availableVersion} ready — restart to install`;
      if (progressWrap) progressWrap.classList.remove("hidden");
      if (progressFill) progressFill.style.width = "100%";
      if (progressLabel) progressLabel.textContent = "100%";
      if (btnInstall) btnInstall.classList.remove("hidden");
      if (btnCheck) btnCheck.disabled = false;
      break;
    case "not-available":
      titleMsg = "";
      settingsMsg = data.isDev
        ? "Auto-update works in the installed app"
        : "You have the latest version";
      if (progressWrap) progressWrap.classList.add("hidden");
      if (btnInstall) btnInstall.classList.add("hidden");
      if (btnCheck) btnCheck.disabled = false;
      break;
    case "error":
      titleMsg = data.isDev ? "" : "Update error";
      titleClass += data.isDev ? "" : " update-err";
      settingsMsg = data.error || "Update check failed";
      if (progressWrap) progressWrap.classList.add("hidden");
      if (btnCheck) btnCheck.disabled = false;
      break;
    default:
      settingsMsg = data.isDev
        ? "Auto-update works after install (packaged build)"
        : "Ready — click Check for updates anytime";
      if (btnCheck) btnCheck.disabled = false;
  }

  if (titleStatus) {
    if (titleMsg) {
      titleStatus.textContent = titleMsg;
      titleStatus.className = titleClass;
    } else {
      titleStatus.textContent = "";
      titleStatus.className = "update-status hidden";
    }
  }

  if (settingsText) settingsText.textContent = settingsMsg;

  const notesPanel = document.getElementById("update-notes-panel");
  const notesBody = document.getElementById("update-notes-body");
  const notesVer = document.getElementById("update-notes-version");
  if (notesPanel && notesBody) {
    if (data.notesText || data.releaseNotes) {
      notesPanel.classList.remove("hidden");
      if (notesVer) {
        notesVer.textContent = data.availableVersion
          ? `What’s new in v${data.availableVersion}`
          : "What’s new";
      }
      notesBody.textContent = data.notesText || "";
    } else if (data.status === "not-available" || data.status === "error") {
      notesPanel.classList.add("hidden");
    }
  }
}

function renderWhatsNewHtml(notes) {
  if (!notes) return `<p class="muted">No notes found for this version.</p>`;
  const section = (title, items) => {
    if (!Array.isArray(items) || !items.length) return "";
    return `<h4>${title}</h4><ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
  };
  const parts = [
    notes.title ? `<p><strong>${escapeHtml(notes.title)}</strong></p>` : "",
    notes.notes ? `<p>${escapeHtml(notes.notes)}</p>` : "",
    section("Added", notes.added),
    section("Fixed", notes.fixed),
    section("Changed", notes.changed),
    section("Removed", notes.removed),
    section("Changelog", notes.changelog),
  ].filter(Boolean);
  return parts.join("") || `<p class="muted">No structured notes yet. Admin can add them on the release.</p>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function openWhatsNew() {
  openModal("modal-whats-new");
  try {
    const v = await window.compiler.getAppVersion();
    const cur = document.getElementById("whats-new-current");
    if (cur) cur.textContent = `v${v}`;
    const input = document.getElementById("whats-new-version-input");
    if (input && !input.value) input.value = v;
  } catch {
    /* ignore */
  }
  await loadWhatsNewNotes();
}

async function loadWhatsNewNotes(mode) {
  const content = document.getElementById("whats-new-content");
  const input = document.getElementById("whats-new-version-input");
  const targetWrap = document.getElementById("whats-new-target-wrap");
  const targetEl = document.getElementById("whats-new-target");
  if (!content) return;
  content.innerHTML = `<p class="muted">Loading…</p>`;

  let version = (input?.value || "").trim().replace(/^v/i, "");
  if (mode === "home") {
    // special: server home release notes
    version = "home";
  }

  try {
    let notes = null;
    if (version === "home" && window.compiler.fetchReleaseNotes) {
      const res = await window.compiler.fetchReleaseNotes("home");
      notes = res?.notes || null;
      if (notes?.version && input) input.value = notes.version;
    } else if (window.compiler.fetchReleaseNotes) {
      const res = await window.compiler.fetchReleaseNotes(version);
      notes = res?.notes || null;
    }
    if (targetWrap && targetEl) {
      if (notes?.version) {
        targetWrap.classList.remove("hidden");
        targetEl.textContent = `v${notes.version}`;
      } else {
        targetWrap.classList.add("hidden");
      }
    }
    content.innerHTML = renderWhatsNewHtml(notes);
  } catch (e) {
    content.innerHTML = `<p class="muted">Could not load notes. ${escapeHtml(e.message || "")}</p>`;
  }
}

async function loadAdminAnnouncement() {
  if (!window.compiler?.fetchAnnouncement) return;
  try {
    const res = await window.compiler.fetchAnnouncement();
    const msg = res?.message;
    if (!msg) return;
    const banner = document.getElementById("admin-banner");
    const title = document.getElementById("admin-banner-title");
    const body = document.getElementById("admin-banner-body");
    const cta = document.getElementById("admin-banner-cta");
    const close = document.getElementById("admin-banner-close");
    if (!banner || !title || !body) return;

    const dismissKey = `admin-banner-dismiss-${msg._id || msg.title}`;
    try {
      if (localStorage.getItem(dismissKey) === "1") return;
    } catch {
      /* ignore */
    }

    title.textContent = msg.title || "Message";
    body.textContent = msg.body || "";
    banner.classList.remove("hidden");
    banner.dataset.type = msg.type || "info";

    if (cta) {
      if (msg.ctaUrl && msg.ctaLabel) {
        cta.href = msg.ctaUrl;
        cta.textContent = msg.ctaLabel;
        cta.classList.remove("hidden");
      } else {
        cta.classList.add("hidden");
      }
    }
    if (close) {
      close.onclick = () => {
        banner.classList.add("hidden");
        try {
          localStorage.setItem(dismissKey, "1");
        } catch {
          /* ignore */
        }
      };
    }
  } catch {
    /* offline */
  }
}

async function checkForUpdatesManual() {
  const btn = document.getElementById("btn-check-update");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Checking…";
  }
  try {
    const result = await window.compiler.checkForUpdates();
    applyUpdateStatus(result);

    if (result.isDev || result.error?.includes("packaged")) {
      showToast("Auto-update only works in the installed (Setup) app.", "error");
    } else if (result.status === "error") {
      showToast(result.error || "Update check failed", "error");
    } else if (result.status === "not-available") {
      showToast("You're on the latest version.", "success");
    } else if (
      result.status === "available" ||
      result.status === "downloading" ||
      result.status === "downloaded" ||
      result.updateInfo
    ) {
      const ver =
        result.availableVersion ||
        result.updateInfo?.version ||
        "new version";
      showToast(`Update found: v${ver}. Downloading…`, "success");
      // Load admin-structured notes (Added / Fixed / Changed / Removed)
      if (window.compiler.fetchReleaseNotes && ver !== "new version") {
        try {
          const notesRes = await window.compiler.fetchReleaseNotes(ver);
          if (notesRes?.text) {
            applyUpdateStatus({
              ...result,
              availableVersion: ver,
              notesText: notesRes.text,
              releaseNotes: notesRes.notes,
            });
          }
        } catch {
          /* ignore */
        }
      }
    } else if (result.ok) {
      showToast("Update check complete.", "success");
    }
  } catch (e) {
    showToast(e.message || "Update check failed", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Check for updates";
    }
  }
}

async function installUpdateNow() {
  const result = await window.compiler.installUpdate();
  if (!result.ok) showToast(result.error || "No update ready", "error");
  else showToast("Restarting to install update…", "success");
}

// ── Settings ──────────────────────────────────────────────

function applyTheme(theme) {
  if (editor) monaco.editor.setTheme(theme);
}

async function openSettings() {
  settings = await window.compiler.getSettings();
  document.getElementById("set-autosave").checked = settings.auto_save_enabled === "true";
  document.getElementById("set-autosave-interval").value = settings.auto_save_interval || "30";
  document.getElementById("set-timeout").value = settings.execution_timeout || "5";
  document.getElementById("set-theme").value = settings.editor_theme || "vs-dark";
  try {
    const version = await window.compiler.getAppVersion();
    document.getElementById("settings-version").textContent = `v${version}`;
    const status = await window.compiler.getUpdateStatus();
    applyUpdateStatus(status);
  } catch (_) { /* ignore */ }
  openModal("modal-settings");
}

async function saveSettingsForm() {
  settings = {
    auto_save_enabled: document.getElementById("set-autosave").checked ? "true" : "false",
    auto_save_interval: document.getElementById("set-autosave-interval").value,
    execution_timeout: document.getElementById("set-timeout").value,
    editor_theme: document.getElementById("set-theme").value,
  };
  await window.compiler.saveSettings(settings);
  applyTheme(settings.editor_theme);
  restartAutoSave();
  closeModal("modal-settings");
  showToast("Settings saved!", "success");
}

// ── Auto-save ─────────────────────────────────────────────

function startAutoSave() {
  restartAutoSave();
}

function restartAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  if (settings.auto_save_enabled !== "true") return;

  const interval = Math.max(10, parseInt(settings.auto_save_interval || "30", 10)) * 1000;
  autoSaveTimer = setInterval(performAutoSave, interval);
}

async function performAutoSave() {
  if (!isDirty || !editor) return;

  setAutoSaveStatus("saving");
  const lang = currentLanguage();
  const title = document.getElementById("file-name").value.trim() || defaultFileName(lang);
  const code = editor.getValue();

  if (activeSnippetId) {
    const result = await window.compiler.saveSnippet({
      id: activeSnippetId,
      title,
      code,
      language: lang,
      folderId: activeFolderId,
    });
    if (!result.error) {
      isDirty = false;
      setAutoSaveStatus("saved");
      await refreshWorkspace();
    }
  } else {
    await window.compiler.saveDraft({ title, code, folderId: activeFolderId, language: lang });
    isDirty = false;
    setAutoSaveStatus("saved");
  }
}

function setAutoSaveStatus(state) {
  const el = document.getElementById("autosave-status");
  if (state === "saving") {
    el.textContent = "Saving...";
    el.className = "autosave-status saving";
  } else if (state === "saved") {
    el.textContent = "Saved";
    el.className = "autosave-status saved";
    setTimeout(() => { if (!isDirty) el.textContent = ""; }, 3000);
  } else {
    el.textContent = isDirty ? "Unsaved" : "";
    el.className = "autosave-status";
  }
}

async function restoreDraftOrDefault() {
  if (activeSnippetId) return;
  const draft = await window.compiler.getDraft();
  if (draft?.code) {
    editor.setValue(draft.code);
    document.getElementById("file-name").value = draft.title;
    activeFolderId = draft.folderId;
    setLanguageUI(draft.language || "javascript");
    isDirty = false;
    showToast("Draft restored", "success");
  }
}

// ── Templates ─────────────────────────────────────────────

function renderTemplates() {
  const list = document.getElementById("template-list");
  if (!list) return;
  list.innerHTML = "";
  const items = TEMPLATES.filter(
    (t) => templateFilter === "all" || t.language === templateFilter
  );
  items.forEach((t) => {
    const card = document.createElement("button");
    card.className = "template-card";
    const proLang = isProLanguage(t.language);
    card.innerHTML = `<h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p><span class="tpl-lang">${esc(t.language)}${proLang && !isPro ? " · Pro" : ""}</span>`;
    card.addEventListener("click", () => {
      if (!isPro && isProLanguage(t.language)) {
        showToast("This template needs Pro (TypeScript / HTML / Node).", "error");
        openActivateModal();
        return;
      }
      if (isDirty && !confirm("Replace current code with template?")) return;
      setLanguageUI(t.language || "javascript");
      editor.setValue(t.code);
      const ext = LANG_EXT[t.language] || "js";
      document.getElementById("file-name").value =
        t.name.toLowerCase().replace(/\s+/g, "-") + `.${ext}`;
      activeSnippetId = null;
      isDirty = true;
      closeModal("modal-templates");
      showToast(`Template "${t.name}" loaded`, "success");
    });
    list.appendChild(card);
  });
  if (!items.length) {
    list.innerHTML = '<div class="history-empty">No templates in this filter</div>';
  }
}

// ── Export (Pro) ──────────────────────────────────────────

async function exportCurrentFile() {
  if (!isPro) {
    showToast("Export is Pro only — Activate Pro to unlock", "error");
    openActivateModal();
    return;
  }
  const lang = currentLanguage();
  const title = document.getElementById("file-name").value.trim() || defaultFileName(lang);
  const code = editor.getValue();
  const result = await window.compiler.exportFile({
    content: code,
    defaultName: title,
    language: lang,
  });

  if (result.canceled) return;
  if (result.error) {
    showToast(result.message || result.error, "error");
    if (result.proRequired) openActivateModal();
    return;
  }
  if (result.ok) showToast(`Exported: ${result.path}`, "success");
}

// ── Version history (Pro) ─────────────────────────────────

async function openHistoryModal() {
  if (!isPro) {
    showToast("Version history is Pro only", "error");
    openActivateModal();
    return;
  }
  if (!activeSnippetId) {
    showToast("Save the file first to use version history", "error");
    return;
  }
  const list = document.getElementById("history-list");
  const desc = document.getElementById("history-desc");
  list.innerHTML = '<div class="history-empty">Loading…</div>';
  openModal("modal-history");

  const versions = await window.compiler.getVersions(activeSnippetId);
  if (!versions?.length) {
    list.innerHTML =
      '<div class="history-empty">No snapshots yet. Save changes to create history.</div>';
    desc.textContent = "Snapshots appear when you edit & save this file.";
    return;
  }

  desc.textContent = `${versions.length} snapshot(s) · restore replaces current code (current is saved first)`;
  list.innerHTML = "";
  versions.forEach((v) => {
    const row = document.createElement("div");
    row.className = "history-item";
    const when = v.created_at
      ? new Date(String(v.created_at).includes("T") ? v.created_at : v.created_at.replace(" ", "T")).toLocaleString()
      : "—";
    row.innerHTML = `
      <div>
        <div class="history-meta"><strong>${esc(when)}</strong> · ${esc(v.language || "js")} · ${v.code_length || 0} chars</div>
        <div class="history-preview">${esc(v.preview || "")}</div>
      </div>
      <button type="button" class="btn-secondary btn-sm" data-id="${v.id}">Restore</button>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      if (!confirm("Restore this snapshot? Current code will be saved as a new version.")) return;
      const res = await window.compiler.restoreVersion(v.id);
      if (res.error) {
        showToast(res.error, "error");
        return;
      }
      if (res.snippet) {
        loadSnippet(res.snippet);
        showToast("Snapshot restored", "success");
        closeModal("modal-history");
        await refreshWorkspace();
      }
    });
    list.appendChild(row);
  });
}

// ── Modals ────────────────────────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
}

function customPrompt(title, defaultValue = "") {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal-prompt");
    const titleEl = document.getElementById("prompt-title");
    const inputEl = document.getElementById("prompt-input");
    const btnCancel = document.getElementById("btn-cancel-prompt");
    const btnSubmit = document.getElementById("btn-submit-prompt");

    titleEl.textContent = title;
    inputEl.value = defaultValue;
    modal.classList.remove("hidden");
    inputEl.focus();
    inputEl.select();

    const cleanup = () => {
      modal.classList.add("hidden");
      btnCancel.removeEventListener("click", onCancel);
      btnSubmit.removeEventListener("click", onSubmit);
      inputEl.removeEventListener("keydown", onKeyDown);
    };

    const onCancel = () => { cleanup(); resolve(null); };
    const onSubmit = () => { cleanup(); resolve(inputEl.value); };
    const onKeyDown = (e) => {
      if (e.key === "Enter") onSubmit();
      if (e.key === "Escape") { e.stopPropagation(); onCancel(); }
    };

    btnCancel.addEventListener("click", onCancel);
    btnSubmit.addEventListener("click", onSubmit);
    inputEl.addEventListener("keydown", onKeyDown);
  });
}

// ── Workspace ─────────────────────────────────────────────

async function refreshWorkspace() {
  [folders, snippets] = await Promise.all([
    window.compiler.getFolders(),
    window.compiler.getSnippets(),
  ]);
  renderFileTree();
  updateSnippetCount();
}

function updateSnippetCount() {
  const max = isPro ? "∞" : snippetLimit;
  document.getElementById("snippet-count").textContent =
    `${snippets.length} / ${max} snippets`;
}

function renderFileTree() {
  const tree = document.getElementById("file-tree");
  tree.innerHTML = "";

  const rootFolders = folders.filter((f) => !f.parent_id);
  const rootSnippets = snippets.filter((s) => !s.folder_id);

  rootFolders.forEach((f) => tree.appendChild(renderFolder(f, 0)));
  rootSnippets.forEach((s) => tree.appendChild(renderSnippet(s, 0)));

  if (rootFolders.length === 0 && rootSnippets.length === 0) {
    tree.innerHTML = '<div style="color:#555;font-size:0.75rem;padding:1rem;text-align:center">No files yet.<br>Click + to start.</div>';
  }
}

function renderFolder(folder, depth) {
  const isOpen = openFolders.has(folder.id);
  const childFolders = folders.filter((f) => f.parent_id === folder.id);
  const childSnippets = snippets.filter((s) => s.folder_id === folder.id);
  const wrapper = document.createElement("div");

  const row = document.createElement("div");
  row.className = "tree-item";
  row.style.paddingLeft = `${depth * 14 + 8}px`;
  row.draggable = true;

  row.innerHTML = `
    <span class="tree-chevron">${childFolders.length + childSnippets.length > 0 ? (isOpen ? "▼" : "▶") : "·"}</span>
    <span class="tree-icon">${iconImg(isOpen ? ICONS.folderJs : ICONS.folder)}</span>
    <span class="tree-name">${esc(folder.name)}</span>
    <div class="tree-actions">
      <button class="tree-action-btn" data-action="add-snippet">+</button>
      <button class="tree-action-btn" data-action="add-folder">📁</button>
      <button class="tree-action-btn" data-action="rename">✎</button>
      <button class="tree-action-btn danger" data-action="delete">×</button>
    </div>
  `;

  row.addEventListener("click", (e) => {
    if (e.target.closest(".tree-action-btn")) return;
    if (childFolders.length + childSnippets.length > 0) {
      openFolders.has(folder.id) ? openFolders.delete(folder.id) : openFolders.add(folder.id);
      renderFileTree();
    }
  });

  row.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("itemId", folder.id);
    e.dataTransfer.setData("itemType", "folder");
  });
  row.addEventListener("dragover", (e) => { e.preventDefault(); e.stopPropagation(); row.classList.add("drag-over"); });
  row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
  row.addEventListener("drop", (e) => onDropOnFolder(e, folder.id, row));

  row.querySelector('[data-action="add-snippet"]').addEventListener("click", (e) => { e.stopPropagation(); newSnippetInFolder(folder.id); });
  row.querySelector('[data-action="add-folder"]').addEventListener("click", (e) => { e.stopPropagation(); promptNewFolder(folder.id); });
  row.querySelector('[data-action="rename"]').addEventListener("click", (e) => { e.stopPropagation(); promptRenameFolder(folder); });
  row.querySelector('[data-action="delete"]').addEventListener("click", async (e) => {
    e.stopPropagation();
    if (confirm(`Delete folder "${folder.name}"?`)) {
      await window.compiler.deleteFolder(folder.id);
      await refreshWorkspace();
    }
  });

  wrapper.appendChild(row);
  if (isOpen) {
    const children = document.createElement("div");
    children.className = "tree-children";
    childFolders.forEach((f) => children.appendChild(renderFolder(f, depth + 1)));
    childSnippets.forEach((s) => children.appendChild(renderSnippet(s, depth + 1)));
    wrapper.appendChild(children);
  }
  return wrapper;
}

function renderSnippet(snippet, depth) {
  const row = document.createElement("div");
  row.className = "tree-item" + (snippet.id === activeSnippetId ? " active" : "");
  row.style.paddingLeft = `${depth * 14 + 22}px`;
  row.draggable = true;

  row.innerHTML = `
    <span class="tree-icon">${iconImg(ICONS.js, "JS file")}</span>
    <span class="tree-name">${esc(snippet.title)}</span>
    <div class="tree-actions">
      <button class="tree-action-btn" data-action="rename">✎</button>
      <button class="tree-action-btn danger" data-action="delete">×</button>
    </div>
  `;

  row.addEventListener("click", (e) => {
    if (e.target.closest(".tree-action-btn")) return;
    loadSnippet(snippet);
  });
  row.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("itemId", snippet.id);
    e.dataTransfer.setData("itemType", "snippet");
  });
  row.querySelector('[data-action="rename"]').addEventListener("click", (e) => { e.stopPropagation(); promptRenameSnippet(snippet); });
  row.querySelector('[data-action="delete"]').addEventListener("click", async (e) => {
    e.stopPropagation();
    if (confirm(`Delete "${snippet.title}"?`)) {
      await window.compiler.deleteSnippet(snippet.id);
      if (activeSnippetId === snippet.id) resetEditor();
      await refreshWorkspace();
    }
  });
  return row;
}

async function onDropOnFolder(e, folderId, row) {
  e.preventDefault(); e.stopPropagation();
  row.classList.remove("drag-over");
  const itemId = parseInt(e.dataTransfer.getData("itemId"));
  const itemType = e.dataTransfer.getData("itemType");
  if (itemType === "folder" && itemId === folderId) return;
  await moveItem(itemId, itemType, folderId);
  openFolders.add(folderId);
}

async function onDropRoot(e) {
  e.preventDefault();
  const itemId = parseInt(e.dataTransfer.getData("itemId"));
  const itemType = e.dataTransfer.getData("itemType");
  if (!itemId) return;
  await moveItem(itemId, itemType, null);
}

async function moveItem(itemId, itemType, targetFolderId) {
  if (itemType === "snippet") await window.compiler.moveSnippet(itemId, targetFolderId);
  else {
    const result = await window.compiler.moveFolder(itemId, targetFolderId);
    if (result.error) { showToast(result.error, "error"); return; }
  }
  await refreshWorkspace();
}

async function promptNewFolder(parentId = null) {
  const name = await customPrompt("Folder name:", "");
  if (!name?.trim()) return;
  await window.compiler.createFolder(name.trim(), parentId);
  if (parentId) openFolders.add(parentId);
  await refreshWorkspace();
}

async function promptRenameFolder(folder) {
  const name = await customPrompt("Rename folder:", folder.name);
  if (!name?.trim() || name === folder.name) return;
  await window.compiler.renameFolder(folder.id, name.trim());
  await refreshWorkspace();
}

async function promptRenameSnippet(snippet) {
  const title = await customPrompt("Rename file:", snippet.title);
  if (!title?.trim() || title === snippet.title) return;
  await window.compiler.saveSnippet({
    id: snippet.id,
    title: title.trim(),
    code: snippet.code,
    language: snippet.language || "javascript",
    folderId: snippet.folder_id,
  });
  if (activeSnippetId === snippet.id) document.getElementById("file-name").value = title.trim();
  await refreshWorkspace();
}

function newSnippetInFolder(folderId) {
  activeSnippetId = null;
  activeFolderId = folderId;
  setLanguageUI("javascript");
  editor.setValue(DEFAULT_CODE);
  document.getElementById("file-name").value = defaultFileName("javascript");
  isDirty = true;
  openFolders.add(folderId);
  renderFileTree();
}

function loadSnippet(snippet) {
  activeSnippetId = snippet.id;
  activeFolderId = snippet.folder_id;
  setLanguageUI(snippet.language || "javascript");
  editor.setValue(snippet.code);
  document.getElementById("file-name").value = snippet.title;
  isDirty = false;
  renderFileTree();
}

function resetEditor() {
  activeSnippetId = null;
  activeFolderId = null;
  setLanguageUI("javascript");
  editor.setValue(DEFAULT_CODE);
  document.getElementById("file-name").value = defaultFileName("javascript");
  isDirty = false;
  window.compiler.clearDraft();
}

// ── Run / Stop ────────────────────────────────────────────

function setRunState(running) {
  isRunning = running;
  const btn = document.getElementById("btn-run");
  const label = document.getElementById("run-label");
  if (running) {
    btn.classList.add("btn-stop");
    label.textContent = "Stop";
  } else {
    btn.classList.remove("btn-stop");
    label.textContent = "Run";
  }
}

async function runCode() {
  if (isRunning) {
    const result = await window.compiler.stopCode();
    setRunState(false);
    appendLogs(result.logs);
    return;
  }

  const lang = currentLanguage();
  if (!isPro && isProLanguage(lang)) {
    showToast(
      "TypeScript / HTML+JS / Node are Pro only. Activate Pro to run.",
      "error",
    );
    openActivateModal();
    return;
  }

  document.getElementById("console").innerHTML = '<div class="log-line log" style="color:#666">Running...</div>';
  setRunState(true);
  const result = await window.compiler.runCode({
    code: editor.getValue(),
    language: lang,
  });
  setRunState(false);
  document.getElementById("console").innerHTML = "";
  appendLogs(result.logs || []);
  if (result.proRequired || result.blocked) {
    showToast(result.logs?.[0]?.text || "Pro required", "error");
    openActivateModal();
    return;
  }
  if (result.stopped) showToast("Infinite loop stopped — app is safe!", "error");
}

function appendLogs(logs) {
  const consoleEl = document.getElementById("console");
  logs.forEach((log) => {
    const line = document.createElement("div");
    line.className = `log-line ${log.type}`;
    line.textContent = log.type === "result" ? `→ ${log.text}` : log.text;
    consoleEl.appendChild(line);
  });
}

// ── Save ──────────────────────────────────────────────────

async function saveSnippet() {
  const lang = currentLanguage();
  if (!isPro && isProLanguage(lang)) {
    showToast(
      "Cannot save TypeScript / HTML / Node on Free plan. Activate Pro.",
      "error",
    );
    openActivateModal();
    return;
  }
  const title = document.getElementById("file-name").value.trim() || defaultFileName(lang);
  const code = editor.getValue();
  const result = await window.compiler.saveSnippet({
    id: activeSnippetId,
    title,
    code,
    language: lang,
    folderId: activeFolderId,
  });

  if (result.error) { showToast(result.error, "error"); return; }

  activeSnippetId = result.id;
  isDirty = false;
  await window.compiler.clearDraft();
  setAutoSaveStatus("saved");
  await refreshWorkspace();
  showToast(isPro ? "Saved! (snapshot kept)" : "Saved!", "success");
}

// ── Pro / Activation ──────────────────────────────────────

async function refreshProStatus() {
  const status = await window.compiler.getProStatus();
  isPro = status.isPro;
  proMeta = status || {};
  const badge = document.getElementById("plan-badge");
  const btnActivate = document.getElementById("btn-activate");
  const metaEl = document.getElementById("license-meta");

  // Enforce free-language lock whenever plan changes
  updateLanguageSelectProState();
  if (!isPro && isProLanguage(activeLanguage)) {
    setLanguageUI("javascript", { silent: true });
  }

  if (isPro) {
    const plan = status.planName || "Pro";
    badge.textContent = plan.length > 14 ? "PRO" : plan.toUpperCase();
    badge.className = "badge badge-pro";
    badge.title = [
      status.planName || "Pro",
      status.maxDevices ? `Devices: ${status.maxDevices}` : null,
      `Expires: ${formatExpiry(status.expiresAt)}`,
    ]
      .filter(Boolean)
      .join(" · ");
    btnActivate.textContent = "Pro Active ✓";
    btnActivate.disabled = true;
    if (metaEl) {
      metaEl.classList.remove("hidden");
      metaEl.textContent = [
        status.planName ? `Plan: ${status.planName}` : "Plan: Pro",
        status.maxDevices != null ? `Devices: up to ${status.maxDevices}` : null,
        `License: ${formatExpiry(status.expiresAt)}`,
      ]
        .filter(Boolean)
        .join(" · ");
    }
  } else {
    badge.textContent = "FREE";
    badge.className = "badge badge-free";
    badge.title = "Free plan — 5 snippets";
    btnActivate.textContent = "Activate Pro";
    btnActivate.disabled = false;
    if (metaEl) {
      metaEl.classList.add("hidden");
      metaEl.textContent = "";
    }
  }
  snippetLimit = (await window.compiler.getSnippetLimit()).limit;
  updateSnippetCount();
}

function openActivateModal() { openModal("modal-activate"); document.getElementById("activation-key").value = ""; }
function closeActivateModal() { closeModal("modal-activate"); }

async function submitActivation() {
  const key = document.getElementById("activation-key").value.trim();
  const errEl = document.getElementById("activation-error");
  const successEl = document.getElementById("activation-success");
  const btn = document.getElementById("btn-submit-activate");

  errEl.classList.add("hidden");
  successEl.classList.add("hidden");
  if (!key || key.length < 8) { errEl.textContent = "Enter a valid activation key"; errEl.classList.remove("hidden"); return; }

  btn.disabled = true; btn.textContent = "Verifying online...";
  const result = await window.compiler.activate(key);
  btn.disabled = false; btn.textContent = "Activate Online";

  if (result.success) {
    successEl.textContent = result.message; successEl.classList.remove("hidden");
    await refreshProStatus(); await refreshWorkspace();
    setTimeout(closeActivateModal, 1500);
  } else {
    errEl.textContent = result.message; errEl.classList.remove("hidden");
  }
}

function showToast(msg, type) {
  const consoleEl = document.getElementById("console");
  const line = document.createElement("div");
  line.className = `log-line ${type === "error" ? "error" : "log"}`;
  line.textContent = msg;
  consoleEl.prepend(line);
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ── Events ────────────────────────────────────────────────

function bindEvents() {
  document.getElementById("btn-run").addEventListener("click", runCode);
  document.getElementById("btn-save").addEventListener("click", saveSnippet);
  document.getElementById("btn-export").addEventListener("click", exportCurrentFile);
  document.getElementById("btn-history").addEventListener("click", openHistoryModal);
  document.getElementById("btn-close-history").addEventListener("click", () => closeModal("modal-history"));
  document.getElementById("btn-templates").addEventListener("click", () => {
    renderTemplates();
    openModal("modal-templates");
  });
  document.getElementById("btn-close-templates").addEventListener("click", () => closeModal("modal-templates"));
  document.getElementById("btn-settings").addEventListener("click", openSettings);
  document.getElementById("btn-save-settings").addEventListener("click", saveSettingsForm);
  document.getElementById("btn-cancel-settings").addEventListener("click", () => closeModal("modal-settings"));
  document.getElementById("btn-check-update").addEventListener("click", checkForUpdatesManual);
  document.getElementById("btn-install-update").addEventListener("click", installUpdateNow);
  document.getElementById("btn-shortcuts").addEventListener("click", () => openModal("modal-shortcuts"));
  document.getElementById("btn-close-shortcuts").addEventListener("click", () => closeModal("modal-shortcuts"));
  document.getElementById("btn-whats-new")?.addEventListener("click", openWhatsNew);
  document.getElementById("btn-whats-new-close")?.addEventListener("click", () => closeModal("modal-whats-new"));
  document.getElementById("btn-whats-new-load")?.addEventListener("click", () => loadWhatsNewNotes());
  document.getElementById("btn-whats-new-latest")?.addEventListener("click", () => loadWhatsNewNotes("home"));
  document.getElementById("btn-clear").addEventListener("click", resetEditor);
  document.getElementById("btn-clear-console").addEventListener("click", () => { document.getElementById("console").innerHTML = ""; });
  document.getElementById("btn-new").addEventListener("click", () => { resetEditor(); renderFileTree(); });
  document.getElementById("btn-new-folder").addEventListener("click", () => promptNewFolder(null));
  document.getElementById("btn-activate").addEventListener("click", openActivateModal);
  document.getElementById("btn-cancel-activate").addEventListener("click", closeActivateModal);
  document.getElementById("btn-submit-activate").addEventListener("click", submitActivation);

  document.getElementById("file-language").addEventListener("change", (e) => {
    const lang = e.target.value;
    if (!isPro && isProLanguage(lang)) {
      e.target.value = "javascript";
      setLanguageUI("javascript", { silent: true });
      showToast(
        "TypeScript, HTML+JS, and Node are Pro features. Activate Pro to unlock.",
        "error",
      );
      openActivateModal();
      return;
    }
    setLanguageUI(lang);
    isDirty = true;
    setAutoSaveStatus("");
    updateNpmBarVisibility();
  });

  document.getElementById("btn-npm-install")?.addEventListener("click", installNpmPackage);
  document.getElementById("btn-npm-refresh")?.addEventListener("click", refreshNpmPackages);
  document.getElementById("npm-package-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      installNpmPackage();
    }
  });

  document.getElementById("template-tabs")?.addEventListener("click", (e) => {
    const tab = e.target.closest(".template-tab");
    if (!tab) return;
    templateFilter = tab.dataset.lang || "all";
    document.querySelectorAll(".template-tab").forEach((t) => {
      t.classList.toggle("active", t === tab);
    });
    renderTemplates();
  });

  document.getElementById("file-tree").addEventListener("dragover", (e) => e.preventDefault());
  document.getElementById("file-tree").addEventListener("drop", onDropRoot);

  // Keep hyphens as pasted (PROMO-XXXX-XXXX-XXXX). Only uppercase + trim junk.
  // Old 4-4-4-4 regrouping broke 5-letter prefixes like PROMO-…
  document.getElementById("activation-key").addEventListener("input", (e) => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    // collapse repeated hyphens
    v = v.replace(/-+/g, "-").replace(/^-/, "");
    e.target.value = v.slice(0, 28);
  });

  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "Enter") { e.preventDefault(); runCode(); }
    if (mod && e.key === "s") { e.preventDefault(); saveSnippet(); }
    if (mod && e.key === "e") { e.preventDefault(); exportCurrentFile(); }
    if (mod && e.key === "h") { e.preventDefault(); openHistoryModal(); }
    if (mod && e.key === "t") { e.preventDefault(); renderTemplates(); openModal("modal-templates"); }
    if (mod && e.key === "n") { e.preventDefault(); resetEditor(); renderFileTree(); }
    if (mod && e.key === ",") { e.preventDefault(); openSettings(); }
    if (mod && e.key === "/") { e.preventDefault(); openModal("modal-shortcuts"); }
    if (e.key === "Escape") closeAllModals();
  });
}