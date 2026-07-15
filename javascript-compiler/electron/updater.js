const { app, ipcMain, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const {
  fetchReleaseNotes,
  formatNotesDetail,
} = require("./announcement");

let mainWindow = null;
let initialized = false;
let checkInFlight = false;
let pollTimer = null;

let updateStatus = {
  status: "idle",
  currentVersion: app.getVersion(),
  availableVersion: null,
  progress: null,
  error: null,
  isDev: !app.isPackaged,
};

function sendStatus(partial) {
  updateStatus = {
    ...updateStatus,
    ...partial,
    currentVersion: app.getVersion(),
    isDev: !app.isPackaged,
  };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", updateStatus);
  }
}

function configureFeed() {
  // Explicit GitHub Releases feed — users update inside the app, no re-download from site
  try {
    autoUpdater.setFeedURL({
      provider: "github",
      owner: "vishvajeet2012",
      repo: "JavaScript-compiler",
    });
  } catch (err) {
    console.warn("[updater] setFeedURL:", err.message);
  }
}

function setupAutoUpdater(win) {
  mainWindow = win;

  if (initialized) return;
  initialized = true;

  configureFeed();

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

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

  autoUpdater.on("update-available", async (info) => {
    let releaseNotes = null;
    try {
      releaseNotes = await fetchReleaseNotes(info.version);
    } catch {
      /* ignore */
    }
    sendStatus({
      status: "available",
      availableVersion: info.version,
      releaseNotes,
      notesText: formatNotesDetail(releaseNotes),
      error: null,
    });
  });

  autoUpdater.on("update-not-available", () => {
    checkInFlight = false;
    sendStatus({
      status: "not-available",
      availableVersion: null,
      error: null,
      progress: null,
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
    checkInFlight = false;

    let structured = null;
    try {
      structured = await fetchReleaseNotes(info.version);
    } catch {
      /* ignore */
    }

    const ghNotes =
      typeof info.releaseNotes === "string"
        ? info.releaseNotes.slice(0, 400)
        : Array.isArray(info.releaseNotes)
          ? info.releaseNotes
              .map((n) => n.note || n)
              .join("\n")
              .slice(0, 400)
          : "";

    const notesText =
      formatNotesDetail(structured) ||
      ghNotes ||
      "No detailed changelog from server yet. Admin can add Added/Fixed/Changed/Removed notes on the release.";

    sendStatus({
      status: "downloaded",
      availableVersion: info.version,
      progress: { percent: 100 },
      releaseNotes: structured,
      notesText,
      error: null,
    });

    if (!mainWindow || mainWindow.isDestroyed()) return;

    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: `Update ready — v${info.version}`,
      message: `Version ${info.version} is ready to install.`,
      detail:
        `${notesText}\n\n` +
        "Restart now to install, or later when you quit. No need to re-download from the website.",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    }
  });

  autoUpdater.on("error", (err) => {
    checkInFlight = false;
    const msg = err?.message || String(err);
    // Soft message for offline / rate limits
    let friendly = msg;
    if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|net::/i.test(msg)) {
      friendly = "No internet connection. Try again when online.";
    } else if (/404|Cannot find latest/i.test(msg)) {
      friendly = "No update feed found yet. A new release will enable updates.";
    }
    sendStatus({
      status: "error",
      error: friendly,
      progress: null,
    });
  });

  ipcMain.handle("get-app-version", () => app.getVersion());

  ipcMain.handle("get-update-status", () => ({
    ...updateStatus,
    currentVersion: app.getVersion(),
    isDev: !app.isPackaged,
  }));

  ipcMain.handle("fetch-release-notes", async (_e, version) => {
    const notes = await fetchReleaseNotes(version || updateStatus.availableVersion);
    return {
      ok: Boolean(notes),
      notes,
      text: formatNotesDetail(notes),
      currentVersion: app.getVersion(),
    };
  });

  const { fetchActiveAnnouncement } = require("./announcement");
  ipcMain.handle("fetch-announcement", async () => {
    const msg = await fetchActiveAnnouncement();
    return { ok: Boolean(msg), message: msg };
  });

  ipcMain.handle("check-for-updates", async () => {
    if (!app.isPackaged) {
      sendStatus({
        status: "error",
        error: "Auto-update only works in the installed (packaged) app.",
        isDev: true,
      });
      return { ok: false, ...updateStatus };
    }

    if (checkInFlight) {
      return { ok: true, ...updateStatus, message: "Check already in progress" };
    }

    if (updateStatus.status === "downloaded") {
      return { ok: true, ...updateStatus };
    }

    checkInFlight = true;
    configureFeed();

    try {
      const result = await autoUpdater.checkForUpdates();
      // Let status events settle so UI gets accurate state
      await new Promise((r) => setTimeout(r, 400));

      if (
        updateStatus.status === "checking" &&
        result?.updateInfo?.version &&
        result.updateInfo.version !== app.getVersion()
      ) {
        sendStatus({
          status: "available",
          availableVersion: result.updateInfo.version,
          error: null,
        });
      }

      if (
        updateStatus.status === "checking" &&
        (!result?.updateInfo ||
          result.updateInfo.version === app.getVersion())
      ) {
        checkInFlight = false;
        sendStatus({
          status: "not-available",
          availableVersion: null,
          error: null,
        });
      }

      return {
        ok: true,
        updateInfo: result?.updateInfo || null,
        ...updateStatus,
      };
    } catch (err) {
      checkInFlight = false;
      const msg = err.message || String(err);
      sendStatus({ status: "error", error: msg });
      return { ok: false, error: msg, ...updateStatus };
    }
  });

  ipcMain.handle("install-update", () => {
    if (updateStatus.status === "downloaded") {
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
      return { ok: true };
    }
    return { ok: false, error: "No update downloaded yet." };
  });

  // Packaged app: check shortly after launch, then every 4 hours
  if (app.isPackaged) {
    setTimeout(() => {
      if (checkInFlight) return;
      checkInFlight = true;
      autoUpdater
        .checkForUpdates()
        .catch((err) => {
          checkInFlight = false;
          console.warn("[updater] Initial check failed:", err.message);
        })
        .then(() => {
          // if still "checking" after promise, clear flag on not-available path via events
          setTimeout(() => {
            if (updateStatus.status === "checking") checkInFlight = false;
          }, 15000);
        });
    }, 8000);

    pollTimer = setInterval(() => {
      if (checkInFlight || updateStatus.status === "downloaded") return;
      checkInFlight = true;
      autoUpdater
        .checkForUpdates()
        .catch(() => {
          checkInFlight = false;
        })
        .then(() => {
          setTimeout(() => {
            if (updateStatus.status === "checking") checkInFlight = false;
          }, 15000);
        });
    }, 4 * 60 * 60 * 1000);

    app.on("before-quit", () => {
      if (pollTimer) clearInterval(pollTimer);
    });
  } else {
    sendStatus({ status: "idle", isDev: true, error: null });
  }
}

module.exports = { setupAutoUpdater };
