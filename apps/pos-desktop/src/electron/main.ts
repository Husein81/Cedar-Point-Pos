import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import dns from "node:dns";
import os from "node:os";
import path from "node:path";
import { getDatabase } from "./database/index.js";
import * as syncQueue from "./database/syncQueue.js";
import { getPreloadPath } from "./pathResolver.js";
import { isDev } from "./utils.js";

const APP_USER_MODEL_ID = "com.cedarcore.cedarpointpos";
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

if (!isDev()) {
  autoUpdater.checkForUpdatesAndNotify();
}

// ✅ IPC HANDLER (ONCE)
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

// ✅ SYNC QUEUE IPC HANDLERS
ipcMain.handle("sync:enqueue", (_event, op: syncQueue.Operation) =>
  syncQueue.enqueueOperation(op),
);
ipcMain.handle("sync:dequeue", (_event, localId) =>
  syncQueue.dequeueOperation(localId),
);
ipcMain.handle("sync:setStatus", (_event, localId, status) =>
  syncQueue.setOperationStatus(localId, status),
);
ipcMain.handle("sync:incrementRetry", (_event, localId) =>
  syncQueue.incrementOperationRetry(localId),
);
ipcMain.handle("sync:markFailed", (_event, localId) =>
  syncQueue.markOperationFailed(localId),
);
ipcMain.handle("sync:clearFailed", () => syncQueue.clearFailedOperations());
ipcMain.handle("sync:getAll", () => syncQueue.getAllOperations());

ipcMain.handle(
  "net:checkStatus",
  async (): Promise<{ hasInterface: boolean; lookupSuccess: boolean }> => {
    let hasInterface = false;
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (!netInterface) continue;
      for (const info of netInterface) {
        if (
          !info.internal &&
          (info.family === "IPv4" || info.family === "IPv6")
        ) {
          hasInterface = true;
          break;
        }
      }
      if (hasInterface) break;
    }

    let lookupSuccess = false;
    try {
      lookupSuccess = await new Promise<boolean>((resolve) => {
        dns.lookup("google.com", (err) => {
          resolve(!err);
        });
      });
    } catch {
      lookupSuccess = false;
    }

    return { hasInterface, lookupSuccess };
  },
);

function getIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, PACKAGED_ICON_RELATIVE_PATH)
    : DEV_ICON_PATH;
}

function loadRenderer(window: BrowserWindow, attempt = 0): void {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (!devServerUrl) {
    window.loadFile(RENDERER_HTML_PATH);
    return;
  }
  window.loadURL(devServerUrl).catch(() => {
    if (attempt >= LOAD_RETRY_LIMIT) {
      console.error("Failed to reach Vite dev server:", devServerUrl);
      return;
    }
    setTimeout(() => loadRenderer(window, attempt + 1), LOAD_RETRY_DELAY_MS);
  });
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    frame: false,
    icon: getIconPath(),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      devTools: isDev(),
      sandbox: true,
    },
  });

  mainWindow.setMinimumSize(MAIN_WINDOW_MIN_WIDTH, MAIN_WINDOW_MIN_HEIGHT);

  loadRenderer(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (process.env.NODE_ENV === "production") {
    mainWindow.webContents.closeDevTools();
  }
};

app.whenReady().then(() => {
  getDatabase(); // Initialize SQLite on startup
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.setAppUserModelId(APP_USER_MODEL_ID);
