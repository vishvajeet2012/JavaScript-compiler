const { app, BrowserWindow, ipcMain, dialog } = require("electron");
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

function runCodeInWorker(code) {
  killActiveWorker();

  return new Promise((resolve) => {
    const timeoutMs = getExecutionTimeoutMs();

    const workerCode = `
      const { parentPort } = require('worker_threads');
      parentPort.on('message', ({ code, timeoutMs }) => {
        const logs = [];
        const origLog = console.log;
        const origErr = console.error;
        const origWarn = console.warn;
        console.log = (...a) => logs.push({ type:'log', text: a.map(String).join(' ') });
        console.error = (...a) => logs.push({ type:'error', text: a.map(String).join(' ') });
        console.warn = (...a) => logs.push({ type:'warn', text: a.map(String).join(' ') });

        const restore = () => {
          console.log = origLog;
          console.error = origErr;
          console.warn = origWarn;
        };

        const run = async () => {
          try {
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            let fn;
            try { fn = new AsyncFunction(code); } catch { fn = new Function(code); }

            let result = fn();
            if (result && typeof result.then === 'function') {
              result = await result;
            }
            if (result !== undefined) logs.push({ type:'result', text: String(result) });
            parentPort.postMessage({ success: true, logs, stopped: false });
          } catch(e) {
            parentPort.postMessage({
              success: false,
              logs: logs.length ? logs.concat({ type:'error', text: e.message }) : [{ type:'error', text: e.message }],
              stopped: false
            });
          } finally {
            restore();
          }
        };

        const timer = setTimeout(() => {
          restore();
          parentPort.postMessage({
            success: false,
            stopped: true,
            logs: [{ type:'error', text: '⛔ Async execution timeout (' + (timeoutMs/1000) + 's)' }]
          });
        }, timeoutMs);

        run().finally(() => clearTimeout(timer));
      });
    `;

    const worker = new Worker(workerCode, { eval: true });
    activeWorker = worker;

    const timeout = setTimeout(() => {
      worker.terminate();
      activeWorker = null;
      resolve({
        success: false,
        stopped: true,
        logs: [{
          type: "error",
          text: `⛔ Execution stopped — infinite loop or timeout (${timeoutMs / 1000}s limit). App is safe.`,
        }],
      });
    }, timeoutMs + 500);

    worker.on("message", (result) => {
      clearTimeout(timeout);
      worker.terminate();
      activeWorker = null;
      resolve(result);
    });

    worker.on("error", (err) => {
      clearTimeout(timeout);
      worker.terminate();
      activeWorker = null;
      resolve({ success: false, logs: [{ type: "error", text: err.message }] });
    });

    worker.postMessage({ code, timeoutMs });
  });
}

app.whenReady().then(async () => {
  if (!IS_PRIMARY_INSTANCE) return;

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
  if (process.platform !== "darwin") app.quit();
});

// Best-effort flush of offline usage when quitting
let isQuitting = false;
app.on("before-quit", (e) => {
  if (isQuitting) return;
  e.preventDefault();
  isQuitting = true;
  killActiveWorker();
  telemetry
    .flushOnQuit()
    .catch(() => {})
    .finally(() => app.exit(0));
});

// ── Code Execution ────────────────────────────────────────

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
      logs: [{ type: "error", text: `🔒 ${langGate.message}` }],
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
      if (listed.packages?.length) {
        result.logs = [
          {
            type: "info",
            text: `ℹ Node sandbox packages: ${listed.packages.slice(0, 12).join(", ")}${listed.packages.length > 12 ? "…" : ""}`,
          },
          ...result.logs,
        ];
      } else {
        result.logs = [
          {
            type: "info",
            text: "ℹ Node mode: use npm install panel for packages (e.g. lodash), then require('lodash')",
          },
          ...result.logs,
        ];
      }
    }
    return result;
  }

  const prepared = runner.prepareCode(raw, language || "javascript");
  telemetry.trackEvent("run_code", {
    codeLength: String(raw || "").length,
    language: prepared.language,
  });
  const result = await runCodeInWorker(prepared.code);
  if (prepared.note && Array.isArray(result.logs)) {
    result.logs = [{ type: "warn", text: `ℹ ${prepared.note}` }, ...result.logs];
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

ipcMain.handle("stop-code", () => {
  const wasRunning = !!activeWorker;
  killActiveWorker();
  if (wasRunning) telemetry.trackEvent("stop_code", {});
  return {
    stopped: wasRunning,
    logs: wasRunning
      ? [{ type: "warn", text: "⏹ Execution stopped by user." }]
      : [],
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