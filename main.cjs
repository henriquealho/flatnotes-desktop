const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const packageJson = require("./package.json");

let mainWindow;
const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "client/dist/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });
  mainWindow.loadFile(path.join(__dirname, "client/dist/index.html"));

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.setTitle(`${packageJson.productName} (${packageJson.version})`);
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for file operations
ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return result.filePaths[0];
});

ipcMain.handle("read-directory", async (event, dirPath) => {
  return await fs.readdir(dirPath);
});

ipcMain.handle("read-file", async (event, filePath) => {
  return await fs.readFile(filePath, "utf8");
});

ipcMain.handle("write-file", async (event, filePath, content) => {
  await fs.writeFile(filePath, content, "utf8");
});

ipcMain.handle("delete-file", async (event, filePath) => {
  await fs.unlink(filePath);
});

ipcMain.handle("create-directory", async (event, dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
});

ipcMain.handle("stat", async (event, filePath) => {
  const stats = await fs.stat(filePath);
  return {
    isDirectory: stats.isDirectory(),
    mtime: stats.mtime,
  };
});

ipcMain.handle("get-default-directory", async () => {
  return app.getPath("documents");
});

ipcMain.handle("exists", async (event, filePath) => {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("write-binary-file", async (event, filePath, buffer) => {
  await fs.writeFile(filePath, Buffer.from(buffer));
});
