const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("compiler", {
  runCode: (codeOrPayload, language) => {
    if (typeof codeOrPayload === "object" && codeOrPayload !== null) {
      return ipcRenderer.invoke("run-code", codeOrPayload);
    }
    return ipcRenderer.invoke("run-code", { code: codeOrPayload, language });
  },
  stopCode: () => ipcRenderer.invoke("stop-code"),
  isRunning: () => ipcRenderer.invoke("is-running"),
  getSnippets: () => ipcRenderer.invoke("get-snippets"),
  saveSnippet: (data) => ipcRenderer.invoke("save-snippet", data),
  deleteSnippet: (id) => ipcRenderer.invoke("delete-snippet", id),
  moveSnippet: (id, folderId) => ipcRenderer.invoke("move-snippet", { id, folderId }),
  getFolders: () => ipcRenderer.invoke("get-folders"),
  createFolder: (name, parentId) => ipcRenderer.invoke("create-folder", { name, parentId }),
  renameFolder: (id, name) => ipcRenderer.invoke("rename-folder", { id, name }),
  deleteFolder: (id) => ipcRenderer.invoke("delete-folder", id),
  moveFolder: (id, parentId) => ipcRenderer.invoke("move-folder", { id, parentId }),
  getProStatus: () => ipcRenderer.invoke("get-pro-status"),
  activate: (key) => ipcRenderer.invoke("activate", key),
  verifyActivation: () => ipcRenderer.invoke("verify-activation"),
  getMachineId: () => ipcRenderer.invoke("get-machine-id"),
  getSnippetLimit: () => ipcRenderer.invoke("get-snippet-limit"),
  // No-op for older UI; server is always production
  setActivationServer: () => ipcRenderer.invoke("set-activation-server"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (s) => ipcRenderer.invoke("save-settings", s),
  saveDraft: (data) => ipcRenderer.invoke("save-draft", data),
  getDraft: () => ipcRenderer.invoke("get-draft"),
  saveSession: (session) => ipcRenderer.invoke("save-session", session),
  getSession: () => ipcRenderer.invoke("get-session"),
  clearDraft: () => ipcRenderer.invoke("clear-draft"),
  exportFile: (data) => ipcRenderer.invoke("export-file", data),
  getVersions: (snippetId) => ipcRenderer.invoke("get-versions", snippetId),
  restoreVersion: (versionId) => ipcRenderer.invoke("restore-version", versionId),
  // Version + auto-update
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getUpdateStatus: () => ipcRenderer.invoke("get-update-status"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("update-status", handler);
    return () => ipcRenderer.removeListener("update-status", handler);
  },
  fetchReleaseNotes: (version) => ipcRenderer.invoke("fetch-release-notes", version),
  fetchAnnouncement: () => ipcRenderer.invoke("fetch-announcement"),
  // Node packages (Pro)
  npmList: () => ipcRenderer.invoke("npm-list"),
  npmInstall: (spec) => ipcRenderer.invoke("npm-install", spec),
  npmRemove: (spec) => ipcRenderer.invoke("npm-remove", spec),
  npmTypes: () => ipcRenderer.invoke("npm-types"),
  // Files on disk
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("write-file", { filePath, content }),
  // Electron 32+ removed File.path; this is the supported replacement
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return null;
    }
  },
  // Integrated terminal (Pro)
  startTerminal: () => ipcRenderer.invoke("terminal-start"),
  sendTerminalInput: (line) => ipcRenderer.invoke("terminal-input", line),
  killTerminal: () => ipcRenderer.invoke("terminal-kill"),
  onTerminalData: (callback) => {
    const handler = (_event, text) => callback(text);
    ipcRenderer.on("terminal-data", handler);
    return () => ipcRenderer.removeListener("terminal-data", handler);
  },
  onTerminalCwd: (callback) => {
    const handler = (_event, cwd) => callback(cwd);
    ipcRenderer.on("terminal-cwd", handler);
    return () => ipcRenderer.removeListener("terminal-cwd", handler);
  },
  onTerminalDone: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("terminal-done", handler);
    return () => ipcRenderer.removeListener("terminal-done", handler);
  },
  onTerminalExit: (callback) => {
    const handler = (_event, code) => callback(code);
    ipcRenderer.on("terminal-exit", handler);
    return () => ipcRenderer.removeListener("terminal-exit", handler);
  },
});
