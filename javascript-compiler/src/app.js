let editor = null;
let activeSnippetId = null;
let activeFolderId = null;
let isPro = false;
let snippetLimit = 5;
let isRunning = false;
let isDirty = false;
let autoSaveTimer = null;
let settings = {};
let folders = [];
let snippets = [];
const openFolders = new Set();

const ICONS = {
  js: "assets/icons/js.svg",
  folder: "assets/icons/folder-default.svg",
  folderJs: "assets/icons/folder-javascript.svg",
};

function iconImg(src, alt = "") {
  return `<img src="${src}" alt="${alt}" class="tree-icon-img" width="16" height="16" />`;
}

const DEFAULT_CODE = `// JavaScript Compiler — write & run code\nconsole.log('Hello World!');\n\nconst sum = (a, b) => a + b;\nconsole.log('2 + 3 =', sum(2, 3));`;

const TEMPLATES = [
  {
    name: "Hello World",
    desc: "Basic console output",
    code: `// Hello World\nconsole.log('Hello, World!');\nconsole.log('Welcome to JS Compiler');`,
  },
  {
    name: "Variables & Types",
    desc: "let, const, typeof",
    code: `let name = "Vishu";\nconst age = 25;\nlet items = [1, 2, 3];\n\nconsole.log(name, age);\nconsole.log(typeof name, typeof items);`,
  },
  {
    name: "Functions",
    desc: "Arrow & regular functions",
    code: `function greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconst add = (a, b) => a + b;\n\nconsole.log(greet("Dev"));\nconsole.log(add(10, 20));`,
  },
  {
    name: "Array Methods",
    desc: "map, filter, reduce",
    code: `const nums = [1, 2, 3, 4, 5];\n\nconst doubled = nums.map(n => n * 2);\nconst evens = nums.filter(n => n % 2 === 0);\nconst sum = nums.reduce((a, b) => a + b, 0);\n\nconsole.log("Doubled:", doubled);\nconsole.log("Evens:", evens);\nconsole.log("Sum:", sum);`,
  },
  {
    name: "Async / Await",
    desc: "Promise with delay",
    code: `function delay(ms) {\n  return new Promise(resolve => setTimeout(resolve, ms));\n}\n\nasync function main() {\n  console.log("Start...");\n  await delay(1000);\n  console.log("Done after 1 second!");\n}\n\nmain();`,
  },
  {
    name: "Fetch API",
    desc: "HTTP request example",
    code: `// Simulated fetch (runs in sandbox)\nasync function fetchData() {\n  console.log("Fetching data...");\n  // Replace with real fetch when needed:\n  // const res = await fetch('https://api.example.com');\n  const data = { id: 1, title: "Sample" };\n  console.log("Response:", JSON.stringify(data, null, 2));\n}\n\nfetchData();`,
  },
  {
    name: "Class OOP",
    desc: "ES6 class example",
    code: `class Animal {\n  constructor(name) {\n    this.name = name;\n  }\n  speak() {\n    return \`\${this.name} makes a sound\`;\n  }\n}\n\nclass Dog extends Animal {\n  speak() { return \`\${this.name} barks!\`; }\n}\n\nconst d = new Dog("Rex");\nconsole.log(d.speak());`,
  },
  {
    name: "DOM Ready",
    desc: "HTML interaction pattern",
    code: `// DOM pattern (for reference)\nconst createButton = () => {\n  const btn = { text: "Click me", clicked: false };\n  const handleClick = () => {\n    btn.clicked = true;\n    console.log("Button clicked!");\n  };\n  return { btn, handleClick };\n};\n\nconst { handleClick } = createButton();\nhandleClick();`,
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
  document.getElementById("machine-id").textContent =
    (await window.compiler.getMachineId()).slice(0, 16) + "...";
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
  document.getElementById("set-server").value = settings.activation_server || "http://localhost:5050";
  openModal("modal-settings");
}

async function saveSettingsForm() {
  settings = {
    auto_save_enabled: document.getElementById("set-autosave").checked ? "true" : "false",
    auto_save_interval: document.getElementById("set-autosave-interval").value,
    execution_timeout: document.getElementById("set-timeout").value,
    editor_theme: document.getElementById("set-theme").value,
    activation_server: document.getElementById("set-server").value.trim(),
  };
  await window.compiler.saveSettings(settings);
  await window.compiler.setActivationServer(settings.activation_server);
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
  const title = document.getElementById("file-name").value.trim() || "untitled.js";
  const code = editor.getValue();

  if (activeSnippetId) {
    const result = await window.compiler.saveSnippet({
      id: activeSnippetId,
      title,
      code,
      folderId: activeFolderId,
    });
    if (!result.error) {
      isDirty = false;
      setAutoSaveStatus("saved");
      await refreshWorkspace();
    }
  } else {
    await window.compiler.saveDraft({ title, code, folderId: activeFolderId });
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
    isDirty = false;
    showToast("Draft restored", "success");
  }
}

// ── Templates ─────────────────────────────────────────────

function renderTemplates() {
  const list = document.getElementById("template-list");
  list.innerHTML = "";
  TEMPLATES.forEach((t) => {
    const card = document.createElement("button");
    card.className = "template-card";
    card.innerHTML = `<h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p>`;
    card.addEventListener("click", () => {
      if (isDirty && !confirm("Replace current code with template?")) return;
      editor.setValue(t.code);
      document.getElementById("file-name").value = t.name.toLowerCase().replace(/\s+/g, "-") + ".js";
      activeSnippetId = null;
      isDirty = true;
      closeModal("modal-templates");
      showToast(`Template "${t.name}" loaded`, "success");
    });
    list.appendChild(card);
  });
}

// ── Export ────────────────────────────────────────────────

async function exportCurrentFile() {
  const title = document.getElementById("file-name").value.trim() || "untitled.js";
  const code = editor.getValue();
  const result = await window.compiler.exportFile({ content: code, defaultName: title });

  if (result.canceled) return;
  if (result.ok) showToast(`Exported: ${result.path}`, "success");
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
  await window.compiler.saveSnippet({ id: snippet.id, title: title.trim(), code: snippet.code, folderId: snippet.folder_id });
  if (activeSnippetId === snippet.id) document.getElementById("file-name").value = title.trim();
  await refreshWorkspace();
}

function newSnippetInFolder(folderId) {
  activeSnippetId = null;
  activeFolderId = folderId;
  editor.setValue(DEFAULT_CODE);
  document.getElementById("file-name").value = "untitled.js";
  isDirty = true;
  openFolders.add(folderId);
  renderFileTree();
}

function loadSnippet(snippet) {
  activeSnippetId = snippet.id;
  activeFolderId = snippet.folder_id;
  editor.setValue(snippet.code);
  document.getElementById("file-name").value = snippet.title;
  isDirty = false;
  renderFileTree();
}

function resetEditor() {
  activeSnippetId = null;
  activeFolderId = null;
  editor.setValue(DEFAULT_CODE);
  document.getElementById("file-name").value = "untitled.js";
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

  document.getElementById("console").innerHTML = '<div class="log-line log" style="color:#666">Running...</div>';
  setRunState(true);
  const result = await window.compiler.runCode(editor.getValue());
  setRunState(false);
  document.getElementById("console").innerHTML = "";
  appendLogs(result.logs);
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
  const title = document.getElementById("file-name").value.trim() || "untitled.js";
  const code = editor.getValue();
  const result = await window.compiler.saveSnippet({ id: activeSnippetId, title, code, folderId: activeFolderId });

  if (result.error) { showToast(result.error, "error"); return; }

  activeSnippetId = result.id;
  isDirty = false;
  await window.compiler.clearDraft();
  setAutoSaveStatus("saved");
  await refreshWorkspace();
  showToast("Saved!", "success");
}

// ── Pro / Activation ──────────────────────────────────────

async function refreshProStatus() {
  const status = await window.compiler.getProStatus();
  isPro = status.isPro;
  const badge = document.getElementById("plan-badge");
  const btnActivate = document.getElementById("btn-activate");

  if (isPro) {
    badge.textContent = "PRO"; badge.className = "badge badge-pro";
    btnActivate.textContent = "Pro Active ✓"; btnActivate.disabled = true;
  } else {
    badge.textContent = "FREE"; badge.className = "badge badge-free";
    btnActivate.textContent = "Activate Pro"; btnActivate.disabled = false;
  }
  snippetLimit = (await window.compiler.getSnippetLimit()).limit;
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
  document.getElementById("btn-templates").addEventListener("click", () => openModal("modal-templates"));
  document.getElementById("btn-close-templates").addEventListener("click", () => closeModal("modal-templates"));
  document.getElementById("btn-settings").addEventListener("click", openSettings);
  document.getElementById("btn-save-settings").addEventListener("click", saveSettingsForm);
  document.getElementById("btn-cancel-settings").addEventListener("click", () => closeModal("modal-settings"));
  document.getElementById("btn-shortcuts").addEventListener("click", () => openModal("modal-shortcuts"));
  document.getElementById("btn-close-shortcuts").addEventListener("click", () => closeModal("modal-shortcuts"));
  document.getElementById("btn-clear").addEventListener("click", resetEditor);
  document.getElementById("btn-clear-console").addEventListener("click", () => { document.getElementById("console").innerHTML = ""; });
  document.getElementById("btn-new").addEventListener("click", () => { resetEditor(); renderFileTree(); });
  document.getElementById("btn-new-folder").addEventListener("click", () => promptNewFolder(null));
  document.getElementById("btn-activate").addEventListener("click", openActivateModal);
  document.getElementById("btn-cancel-activate").addEventListener("click", closeActivateModal);
  document.getElementById("btn-submit-activate").addEventListener("click", submitActivation);

  document.getElementById("file-tree").addEventListener("dragover", (e) => e.preventDefault());
  document.getElementById("file-tree").addEventListener("drop", onDropRoot);

  document.getElementById("activation-key").addEventListener("input", (e) => {
    let v = e.target.value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    v = v.match(/.{1,4}/g)?.join("-") || v;
    e.target.value = v.slice(0, 19);
  });

  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "Enter") { e.preventDefault(); runCode(); }
    if (mod && e.key === "s") { e.preventDefault(); saveSnippet(); }
    if (mod && e.key === "e") { e.preventDefault(); exportCurrentFile(); }
    if (mod && e.key === "t") { e.preventDefault(); openModal("modal-templates"); }
    if (mod && e.key === "n") { e.preventDefault(); resetEditor(); renderFileTree(); }
    if (mod && e.key === ",") { e.preventDefault(); openSettings(); }
    if (mod && e.key === "/") { e.preventDefault(); openModal("modal-shortcuts"); }
    if (e.key === "Escape") closeAllModals();
  });
}