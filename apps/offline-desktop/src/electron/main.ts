import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";

import { getDatabase } from "./database/connection";
import { registerIpcHandlers } from "./ipc/register-handlers";
import { getPreloadPath } from "./pathResolver";
import { isDev } from "./utils";

const APP_USER_MODEL_ID = "com.cedarcore.cedarpointpos.offline";

const MAIN_WINDOW_WIDTH = 1280;
const MAIN_WINDOW_HEIGHT = 800;

const MAIN_WINDOW_MIN_WIDTH = 1000;
const MAIN_WINDOW_MIN_HEIGHT = 600;

const DEV_ICON_PATH = path.join(__dirname, "../public/assets/icon.png");
const PACKAGED_ICON_RELATIVE_PATH = path.join("assets", "icon.png");

const RENDERER_HTML_PATH = path.join(__dirname, "../dist/index.html");

const LOAD_RETRY_DELAY_MS = 300;
const LOAD_RETRY_LIMIT = 20;

let mainWindow: BrowserWindow | null = null;

// ===============================
// FRAME ACTIONS
// ===============================

ipcMain.on("frame-action", (_event, action) => {
  if (!mainWindow) return;

  switch (action) {
    case "CLOSE":
      mainWindow.close();
      break;

    case "MINIMIZE":
      mainWindow.minimize();
      break;

    case "MAXIMIZE":
      mainWindow.isMaximized()
        ? mainWindow.unmaximize()
        : mainWindow.maximize();
      break;
  }
});

ipcMain.handle("app:getInfo", () => ({
  version: app.getVersion(),
  electronVersion: process.versions.electron,
  chromeVersion: process.versions.chrome,
  nodeVersion: process.versions.node,
  platform: process.platform,
  arch: process.arch,
  isPackaged: app.isPackaged,
}));

// ===============================
// WINDOW
// ===============================

function getIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, PACKAGED_ICON_RELATIVE_PATH)
    : DEV_ICON_PATH;
}

function loadRenderer(window: BrowserWindow, attempt = 0) {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (!devServerUrl) {
    window.loadFile(RENDERER_HTML_PATH);
    return;
  }

  window.loadURL(devServerUrl).catch(() => {
    if (attempt >= LOAD_RETRY_LIMIT) {
      console.error("Failed to load renderer");
      return;
    }

    setTimeout(() => loadRenderer(window, attempt + 1), LOAD_RETRY_DELAY_MS);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    frame: false,
    icon: getIconPath(),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      sandbox: true,
      devTools: isDev(),
    },
  });

  mainWindow.setMinimumSize(MAIN_WINDOW_MIN_WIDTH, MAIN_WINDOW_MIN_HEIGHT);

  loadRenderer(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ===============================
// APP LIFECYCLE
// ===============================

app.setAppUserModelId(APP_USER_MODEL_ID);

app.whenReady().then(() => {
  getDatabase();
  registerIpcHandlers();
  createWindow();
});

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
