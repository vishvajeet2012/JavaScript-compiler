const { contextBridge, ipcRenderer } = require("electron");

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
});
