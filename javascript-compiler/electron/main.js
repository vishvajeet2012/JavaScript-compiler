const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { Worker } = require("worker_threads");
const db = require("./db");
const activation = require("./activation");

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

  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }
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
  db.initDb();
  await activation.verifyActivation();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  killActiveWorker();
  if (process.platform !== "darwin") app.quit();
});

// ── Code Execution ────────────────────────────────────────

ipcMain.handle("run-code", async (_, code) => runCodeInWorker(code));

ipcMain.handle("stop-code", () => {
  const wasRunning = !!activeWorker;
  killActiveWorker();
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
  const id = db.saveSnippet(data);
  return { id };
});

ipcMain.handle("delete-snippet", (_, id) => {
  db.deleteSnippet(id);
  return { ok: true };
});

ipcMain.handle("move-snippet", (_, { id, folderId }) => {
  db.moveSnippet(id, folderId);
  return { ok: true };
});

// ── Folders ───────────────────────────────────────────────

ipcMain.handle("get-folders", () => db.getFolders());

ipcMain.handle("create-folder", (_, { name, parentId }) => {
  const id = db.createFolder({ name, parentId });
  return { id };
});

ipcMain.handle("rename-folder", (_, { id, name }) => {
  db.renameFolder(id, name);
  return { ok: true };
});

ipcMain.handle("delete-folder", (_, id) => {
  db.deleteFolder(id);
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
ipcMain.handle("activate", async (_, key) => activation.activate(key));
ipcMain.handle("verify-activation", async () => activation.verifyActivation());
ipcMain.handle("get-machine-id", () => activation.getMachineId());
ipcMain.handle("get-snippet-limit", () => ({
  limit: activation.FREE_SNIPPET_LIMIT,
  isPro: db.getActivation()?.is_pro === 1,
}));
ipcMain.handle("set-activation-server", (_, url) => {
  db.setSetting("activation_server", url);
  return { ok: true };
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

// ── Export ──────────────────────────────────────────────

ipcMain.handle("export-file", async (_, { content, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || "untitled.js",
    filters: [
      { name: "JavaScript", extensions: ["js"] },
      { name: "Text", extensions: ["txt"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, content, "utf8");
  return { ok: true, path: result.filePath };
});