import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
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

// ===============================
// AUTO UPDATER
// ===============================

function setupAutoUpdater() {
  if (isDev()) return;

  // Repo is private — electron-updater only uses the authenticated API
  // (instead of the public releases.atom feed, which 404s for private
  // repos) when GH_TOKEN is set. See electron-builder.config.cjs's
  // `publish.private` and vite.main.config.ts for where this is baked in.
  if (__GH_UPDATE_TOKEN__) {
    process.env.GH_TOKEN = __GH_UPDATE_TOKEN__;
  }

  autoUpdater.logger = log;

  log.transports.file.level = "info";

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates...");

    mainWindow?.webContents.send("update:checking");
  });

  autoUpdater.on("update-available", (info) => {
    console.log(`Update available: ${info.version}`);

    mainWindow?.webContents.send("update:available", info.version);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("No update available");

    mainWindow?.webContents.send("update:not-available");
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow?.webContents.send("update:progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", async () => {
    mainWindow?.webContents.send("update:downloaded");

    const result = await dialog.showMessageBox({
      type: "question",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update Ready",
      message:
        "A new version has been downloaded. Restart the application to apply the update?",
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto updater error:", error);

    log.error(error);

    mainWindow?.webContents.send("update:error", error.message);
  });

  // Initial check
  autoUpdater.checkForUpdatesAndNotify();

  // Check every 4 hours
  setInterval(
    () => {
      autoUpdater.checkForUpdates();
    },
    1000 * 60 * 60 * 4,
  );
}

// ===============================
// GLOBALS
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

// ===============================
// APP INFO & UPDATES
// ===============================

ipcMain.handle("app:getInfo", () => ({
  version: app.getVersion(),
  electronVersion: process.versions.electron,
  chromeVersion: process.versions.chrome,
  nodeVersion: process.versions.node,
  platform: process.platform,
  arch: process.arch,
  isPackaged: app.isPackaged,
}));

ipcMain.handle("update:check", () => {
  if (isDev()) return;

  return autoUpdater.checkForUpdates();
});

ipcMain.handle("update:install", () => {
  if (isDev()) return;

  autoUpdater.quitAndInstall();
});

// ===============================
// SYNC QUEUE IPC
// ===============================

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

// ===============================
// NETWORK STATUS
// ===============================

ipcMain.handle("net:checkStatus", async () => {
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
      dns.lookup("google.com", (error) => {
        resolve(!error);
      });
    });
  } catch {
    lookupSuccess = false;
  }

  return {
    hasInterface,
    lookupSuccess,
  };
});

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

  createWindow();

  setupAutoUpdater();
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
