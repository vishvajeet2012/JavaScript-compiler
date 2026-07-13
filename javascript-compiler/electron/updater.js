const { app, ipcMain, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

let mainWindow = null;
let initialized = false;
let updateStatus = {
  status: "idle",
  currentVersion: app.getVersion(),
  availableVersion: null,
  progress: null,
  error: null,
  isDev: !app.isPackaged,
};

function sendStatus(partial) {
  updateStatus = { ...updateStatus, ...partial, currentVersion: app.getVersion() };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", updateStatus);
  }
}

function setupAutoUpdater(win) {
  mainWindow = win;

  if (initialized) return;
  initialized = true;

  // Windows NSIS + GitHub Releases
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  // Differential updates when available
  try {
    autoUpdater.disableDifferentialDownload = false;
  } catch {
    /* ignore */
  }

  autoUpdater.logger = {
    info: (...args) => console.log("[updater]", ...args),
    warn: (...args) => console.warn("[updater]", ...args),
    error: (...args) => console.error("[updater]", ...args),
    debug: (...args) => console.log("[updater:debug]", ...args),
  };

  autoUpdater.on("checking-for-update", () => {
    sendStatus({ status: "checking", error: null });
  });

  autoUpdater.on("update-available", (info) => {
    sendStatus({
      status: "available",
      availableVersion: info.version,
      error: null,
    });
  });

  autoUpdater.on("update-not-available", () => {
    sendStatus({
      status: "not-available",
      availableVersion: null,
      error: null,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendStatus({
      status: "downloading",
      progress: {
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      },
      error: null,
    });
  });

  autoUpdater.on("update-downloaded", async (info) => {
    sendStatus({
      status: "downloaded",
      availableVersion: info.version,
      progress: { percent: 100 },
      error: null,
    });

    if (!mainWindow || mainWindow.isDestroyed()) return;

    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update ready",
      message: `Version ${info.version} has been downloaded.`,
      detail: "Restart now to install the update, or later when you quit the app.",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      // isSilent=false, isForceRunAfter=true (Windows NSIS)
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    }
  });

  autoUpdater.on("error", (err) => {
    sendStatus({
      status: "error",
      error: err?.message || String(err),
    });
  });

  ipcMain.handle("get-app-version", () => app.getVersion());

  ipcMain.handle("get-update-status", () => ({
    ...updateStatus,
    currentVersion: app.getVersion(),
    isDev: !app.isPackaged,
  }));

  ipcMain.handle("check-for-updates", async () => {
    if (!app.isPackaged) {
      sendStatus({
        status: "error",
        error: "Auto-update only works in the installed (packaged) app.",
        isDev: true,
      });
      return { ok: false, ...updateStatus };
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, updateInfo: result?.updateInfo || null, ...updateStatus };
    } catch (err) {
      sendStatus({ status: "error", error: err.message });
      return { ok: false, error: err.message, ...updateStatus };
    }
  });

  ipcMain.handle("install-update", () => {
    if (updateStatus.status === "downloaded") {
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
      return { ok: true };
    }
    return { ok: false, error: "No update downloaded yet." };
  });

  // Packaged app: check after launch, then every 4 hours
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn("[updater] Initial check failed:", err.message);
      });
    }, 8000);

    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 4 * 60 * 60 * 1000);
  } else {
    sendStatus({ status: "idle", isDev: true, error: null });
  }
}

module.exports = { setupAutoUpdater };
