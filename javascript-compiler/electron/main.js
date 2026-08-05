const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { Worker } = require("worker_threads");
const db = require("./db");
const activation = require("./activation");
const runner = require("./runner");
const { setupAutoUpdater } = require("./updater");
const telemetry = require("./telemetry");
const protection = require("./protection");
const { startCrashReporter } = require("./crash-reporter");
const packages = require("./packages");
const terminalBackend = require("./terminal");

// Windows toast / jump-list identity
if (process.platform === "win32") {
  app.setAppUserModelId("com.vishvajeetshukla.javascript-compiler");
}

// System-level: only one app instance
const IS_PRIMARY_INSTANCE = protection.enforceSingleInstance();

let mainWindow = null;
let activeWorker = null;

function getExecutionTimeoutMs() {
  const sec = parseInt(db.getSetting("execution_timeout", "5"), 10);
  return Math.min(Math.max(sec, 1), 30) * 1000;
}

function getAppIcon() {
  const iconPath = path.join(__dirname, "../assets/icon.png");
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "JS Compiler",
    icon: getAppIcon(),
    backgroundColor: "#0a0a0f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../src/index.html"));
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setTitle(`JS Compiler v${app.getVersion()}`);

  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }

  protection.onWindowCreated(mainWindow);
  setupAutoUpdater(mainWindow);
}

function killActiveWorker() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
}

// Serializer source, injected as text into sandboxes (see electron/inspect.js).
// The trailing module.exports block is dropped so the source can be inlined
// into contexts that have no CommonJS module wrapper.
const INSPECT_SOURCE = fs
  .readFileSync(path.join(__dirname, "inspect.js"), "utf8")
  .replace(/module\.exports[\s\S]*$/, "");

function buildWorkerSource() {
  return `
${INSPECT_SOURCE}

const { parentPort } = require('worker_threads');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

parentPort.on('message', ({ code, timeoutMs, lineOffset, lineMappable }) => {
  const emit = (entry) => { try { parentPort.postMessage({ t: 'log', entry }); } catch {} };
  const original = {
    log: console.log, error: console.error, warn: console.warn,
    info: console.info, debug: console.debug,
  };
  let stackOffset = null;

  const capture = (type) => (...args) => {
    let line = null;
    if (lineMappable && stackOffset !== null) {
      line = userLineFromStack(new Error().stack, stackOffset, lineOffset);
    }
    emit({ type, line, parts: serializeArgs(args) });
  };

  const restore = () => {
    console.log = original.log;
    console.error = original.error;
    console.warn = original.warn;
    console.info = original.info;
    console.debug = original.debug;
  };

  const run = async () => {
    let compiled = null;
    try {
      try {
        compiled = new AsyncFunction(code);
        stackOffset = measureLineOffset(AsyncFunction);
      } catch {
        compiled = new Function(code);
        stackOffset = measureLineOffset(Function);
      }
      if (lineMappable && stackOffset !== null) {
        setStackTransform((s) => cleanStack(s, stackOffset, lineOffset));
      }
    } catch (e) {
      emit({ type: 'error', line: null, parts: [serializeArg(e)] });
      parentPort.postMessage({ t: 'done', success: false, stopped: false });
      return;
    }

    console.log = capture('log');
    console.error = capture('error');
    console.warn = capture('warn');
    console.info = capture('info');
    console.debug = capture('log');

    try {
      let result = compiled();
      if (result && typeof result.then === 'function') result = await result;
      if (result !== undefined) {
        emit({ type: 'result', line: null, parts: [serializeArg(result)] });
      }
      restore();
      parentPort.postMessage({ t: 'done', success: true, stopped: false });
    } catch (e) {
      const line = lineMappable && stackOffset !== null
        ? userLineFromStack(e && e.stack, stackOffset, lineOffset)
        : null;
      emit({ type: 'error', line, parts: [serializeArg(e)] });
      restore();
      parentPort.postMessage({ t: 'done', success: false, stopped: false });
    }
  };

  const timer = setTimeout(() => {
    restore();
    emit({
      type: 'error',
      line: null,
      parts: [{ k: 'text', v: '⛔ Async execution timeout (' + (timeoutMs / 1000) + 's)' }],
    });
    parentPort.postMessage({ t: 'done', success: false, stopped: true });
  }, timeoutMs);

  run().finally(() => clearTimeout(timer));
});
`;
}

function runCodeInWorker(code, { lineOffset = 0, lineMappable = true } = {}) {
  killActiveWorker();

  return new Promise((resolve) => {
    const timeoutMs = getExecutionTimeoutMs();
    const worker = new Worker(buildWorkerSource(), { eval: true });
    activeWorker = worker;

    // Logs stream in so partial output survives a timeout / infinite loop.
    const logs = [];
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.terminate();
      activeWorker = null;
      resolve(payload);
    };

    const timeout = setTimeout(() => {
      logs.push({
        type: "error",
        line: null,
        parts: [{
          k: "text",
          v: `⛔ Execution stopped — infinite loop or timeout (${timeoutMs / 1000}s limit). App is safe.`,
        }],
      });
      finish({ success: false, stopped: true, logs });
    }, timeoutMs + 500);

    worker.on("message", (msg) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.t === "log") {
        logs.push(msg.entry);
        return;
      }
      if (msg.t === "done") {
        finish({ success: !!msg.success, stopped: !!msg.stopped, logs });
      }
    });

    worker.on("error", (err) => {
      logs.push({ type: "error", line: null, parts: [{ k: "text", v: err.message }] });
      finish({ success: false, logs });
    });

    worker.postMessage({ code, timeoutMs, lineOffset, lineMappable });
  });
}

app.whenReady().then(async () => {
  if (!IS_PRIMARY_INSTANCE) return;

  // No native menu/accelerators — custom titlebar owns all shortcuts
  Menu.setApplicationMenu(null);

  db.initDb();
  // Always use production activation API (wipe old localhost:5000 overrides)
  activation.ensureProductionServer();
  // Silent crash reports (offline queue → server)
  startCrashReporter();
  // Silent usage tracking — offline queue, sync when online (no UI)
  telemetry.startSession();
  await activation.verifyActivation();
  createWindow();

  // System software protection (kill-switch, license, single-instance helpers)
  protection.startProtection({ getWindow: () => mainWindow });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  killActiveWorker();
  terminalBackend.stop();
  if (process.platform !== "darwin") app.quit();
});

// Best-effort flush of offline usage when quitting
let isQuitting = false;
app.on("before-quit", (e) => {
  if (isQuitting) return;
  e.preventDefault();
  isQuitting = true;
  killActiveWorker();
  terminalBackend.stop();
  telemetry
    .flushOnQuit()
    .catch(() => {})
    .finally(() => app.exit(0));
});

// ── Code Execution ────────────────────────────────────────

/** Plain-text console entry in the structured log format. */
function textLog(type, text) {
  return { type, line: null, parts: [{ k: "text", v: text }] };
}

ipcMain.handle("run-code", async (_, payload) => {
  // Backward compatible: string code OR { code, language }
  const raw = typeof payload === "string" ? payload : payload?.code;
  const language = typeof payload === "object" && payload ? payload.language : "javascript";

  // Free plan: JavaScript only — TypeScript / HTML / Node are Pro
  const langGate = activation.canUseLanguage(language);
  if (!langGate.allowed) {
    telemetry.trackEvent("run_code_blocked", { language: langGate.language || language });
    return {
      success: false,
      logs: [textLog("error", `🔒 ${langGate.message}`)],
      blocked: true,
      proRequired: true,
    };
  }

  const lang = String(language || "javascript").toLowerCase();

  // Node mode: real process + npm packages (Pro)
  if (lang === "node" || lang === "nodejs") {
    const timeoutMs = getExecutionTimeoutMs();
    telemetry.trackEvent("run_code", {
      codeLength: String(raw || "").length,
      language: "node",
      runtime: "node-packages",
    });
    const result = await packages.runNodeCode(raw, { timeoutMs });
    if (result.success && Array.isArray(result.logs)) {
      const listed = packages.listPackages();
      const note = listed.packages?.length
        ? `ℹ Node sandbox packages: ${listed.packages.slice(0, 12).join(", ")}${listed.packages.length > 12 ? "…" : ""}`
        : "ℹ Node mode: use npm install panel for packages (e.g. lodash), then require('lodash')";
      result.logs = [textLog("info", note), ...result.logs];
    }
    return result;
  }

  const prepared = runner.prepareCode(raw, language || "javascript");
  telemetry.trackEvent("run_code", {
    codeLength: String(raw || "").length,
    language: prepared.language,
  });
  const result = await runCodeInWorker(prepared.code, {
    lineOffset: prepared.lineOffset,
    lineMappable: prepared.lineMappable,
  });
  if (prepared.note && Array.isArray(result.logs)) {
    result.logs = [textLog("warn", `ℹ ${prepared.note}`), ...result.logs];
  }
  return result;
});

// ── npm packages (Node mode, Pro) ─────────────────────────

ipcMain.handle("npm-list", () => packages.listPackages());

ipcMain.handle("npm-install", async (_, spec) => {
  const res = await packages.installPackage(spec);
  if (res.ok) {
    telemetry.trackEvent("npm_install", { package: String(spec || "").slice(0, 80) });
  }
  return res;
});

ipcMain.handle("npm-remove", async (_, spec) => {
  const res = await packages.removePackage(spec);
  if (res.ok) {
    telemetry.trackEvent("npm_remove", { package: String(spec || "").slice(0, 80) });
  }
  return res;
});

// ── Integrated terminal (Pro) ─────────────────────────────

ipcMain.handle("terminal-start", () => {
  if (!activation.isProActive()) {
    return {
      ok: false,
      error: "Integrated terminal is a Pro feature. Activate Pro to use it.",
      proRequired: true,
    };
  }
  const cwd = packages.sandboxRoot();
  const result = terminalBackend.start(cwd, {
    onData: (text) => mainWindow?.webContents.send("terminal-data", text),
    onCwd: (cwd2) => mainWindow?.webContents.send("terminal-cwd", cwd2),
    onDone: () => mainWindow?.webContents.send("terminal-done"),
    onExit: (code) => mainWindow?.webContents.send("terminal-exit", code),
  });
  if (result.ok) telemetry.trackEvent("terminal_start", {});
  return result;
});

ipcMain.handle("terminal-input", (_, line) => terminalBackend.sendCommand(line));

ipcMain.handle("terminal-kill", () => {
  terminalBackend.stop();
  return { ok: true };
});

ipcMain.handle("stop-code", () => {
  const wasRunning = !!activeWorker;
  killActiveWorker();
  if (wasRunning) telemetry.trackEvent("stop_code", {});
  return {
    stopped: wasRunning,
    logs: wasRunning ? [textLog("warn", "⏹ Execution stopped by user.")] : [],
  };
});

ipcMain.handle("is-running", () => !!activeWorker);

// ── Snippets ──────────────────────────────────────────────

ipcMain.handle("get-snippets", () => db.getSnippets());

ipcMain.handle("save-snippet", (_, data) => {
  if (!data.id) {
    const count = db.getSnippetCount();
    const check = activation.canSaveSnippet(count);
    if (!check.allowed) return { error: check.message };
  }
  const langGate = activation.canUseLanguage(data.language || "javascript");
  if (!langGate.allowed) {
    return { error: langGate.message };
  }
  const id = db.saveSnippet(data);
  telemetry.trackEvent("save_snippet", {
    isNew: !data.id,
    titleLength: String(data.title || "").length,
    codeLength: String(data.code || "").length,
    language: data.language || "javascript",
  });
  return { id };
});

ipcMain.handle("delete-snippet", (_, id) => {
  db.deleteSnippet(id);
  telemetry.trackEvent("delete_snippet", { id });
  return { ok: true };
});

ipcMain.handle("move-snippet", (_, { id, folderId }) => {
  db.moveSnippet(id, folderId);
  telemetry.trackEvent("move_snippet", { id });
  return { ok: true };
});

// ── Folders ───────────────────────────────────────────────

ipcMain.handle("get-folders", () => db.getFolders());

ipcMain.handle("create-folder", (_, { name, parentId }) => {
  const id = db.createFolder({ name, parentId });
  telemetry.trackEvent("create_folder", { name });
  return { id };
});

ipcMain.handle("rename-folder", (_, { id, name }) => {
  db.renameFolder(id, name);
  return { ok: true };
});

ipcMain.handle("delete-folder", (_, id) => {
  db.deleteFolder(id);
  telemetry.trackEvent("delete_folder", { id });
  return { ok: true };
});

ipcMain.handle("move-folder", (_, { id, parentId }) => {
  try {
    db.moveFolder(id, parentId);
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
});

// ── Activation ──────────────────────────────────────────

ipcMain.handle("get-pro-status", () => activation.getProStatus());
ipcMain.handle("activate", async (_, key) => {
  const result = await activation.activate(key);
  telemetry.trackEvent("activate", {
    success: !!result.success,
    // never store full key in event payload beyond short prefix
    keyPrefix: String(key || "").slice(0, 4),
  });
  // try push immediately after activation (internet is available)
  telemetry.flushToServer().catch(() => {});
  return result;
});
ipcMain.handle("verify-activation", async () => activation.verifyActivation());
ipcMain.handle("get-machine-id", () => activation.getMachineId());
ipcMain.handle("get-snippet-limit", () => ({
  limit: activation.FREE_SNIPPET_LIMIT,
  isPro: activation.isProActive(),
}));
// Activation server is fixed to production — UI no longer exposes this
ipcMain.handle("set-activation-server", () => {
  activation.ensureProductionServer();
  return { ok: true, server: activation.DEFAULT_SERVER };
});

// ── Version history (Pro) ────────────────────────────────

ipcMain.handle("get-versions", (_, snippetId) => {
  if (!snippetId) return [];
  return db.getVersions(snippetId);
});

ipcMain.handle("restore-version", (_, versionId) => {
  const gate = activation.canUseVersionHistory();
  if (!gate.allowed) return { error: gate.message };
  try {
    const snippet = db.restoreVersion(versionId);
    telemetry.trackEvent("restore_version", { versionId });
    return { ok: true, snippet };
  } catch (e) {
    return { error: e.message };
  }
});

// ── Settings ────────────────────────────────────────────

ipcMain.handle("get-settings", () => db.getAllSettings());

ipcMain.handle("save-settings", (_, settings) => {
  db.saveSettings(settings);
  return { ok: true };
});

ipcMain.handle("save-draft", (_, data) => {
  db.saveDraft(data);
  return { ok: true };
});

ipcMain.handle("get-draft", () => db.getDraft());

// Whole editor session (all open tabs, saved or not)
ipcMain.handle("save-session", (_, session) => {
  db.saveSession(session);
  return { ok: true };
});

ipcMain.handle("get-session", () => db.getSession());

ipcMain.handle("clear-draft", () => {
  db.clearDraft();
  return { ok: true };
});

// ── Export (Pro only) ───────────────────────────────────

ipcMain.handle("export-file", async (_, { content, defaultName, language }) => {
  const gate = activation.canExport();
  if (!gate.allowed) {
    return { error: gate.message, proRequired: true };
  }
  const filters = runner.exportFilters(language);
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || `untitled.${runner.defaultExtension(language)}`,
    filters,
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, content, "utf8");
  telemetry.trackEvent("export_file", { language: language || "javascript" });
  return { ok: true, path: result.filePath };
});