const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  readDirectory: (dirPath) => ipcRenderer.invoke("read-directory", dirPath),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke("write-file", filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke("delete-file", filePath),
  createDirectory: (dirPath) => ipcRenderer.invoke("create-directory", dirPath),
  exists: (filePath) => ipcRenderer.invoke("exists", filePath),
  stat: (filePath) => ipcRenderer.invoke("stat", filePath),
  getDefaultDirectory: () => ipcRenderer.invoke("get-default-directory"),
  writeBinaryFile: (filePath, buffer) =>
    ipcRenderer.invoke("write-binary-file", filePath, buffer),
});
