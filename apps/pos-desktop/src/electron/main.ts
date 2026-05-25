import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";
import { updateElectronApp } from "update-electron-app";
import squirrelStartup from "electron-squirrel-startup";
import { getDatabase } from "./database/index.js";
import * as syncQueue from "./database/syncQueue.js";

if (squirrelStartup) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

updateElectronApp();

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
ipcMain.handle("sync:enqueue", (_event, op) => syncQueue.enqueueOperation(op));
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

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    icon: path.join(__dirname, "../../public/assets/icon.png"),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      devTools: isDev(),
      sandbox: true,
    },
  });

  mainWindow.setMinimumSize(1000, 600);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

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

app.setAppUserModelId("com.squirrel.CedarPointPos.CedarPointPos");
