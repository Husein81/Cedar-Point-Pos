import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";
import * as mod from "./database-manager.js";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

/* ============================================================================
   TYPES
============================================================================ */

interface DatabaseConfig {
  tenantId: string;
  deviceId: string;
  deviceToken: string;
  branchId: string;
}

interface SyncService {
  getSyncStats(): unknown;
  syncPendingChanges(): Promise<void>;
  pullUpdates(): Promise<void>;
  retryFailedSyncs(): Promise<void>;
  queueChange(
    entityType: string,
    entityId: string,
    operation: string,
    payload: unknown
  ): void;
}

interface DatabaseManager {
  initializeDatabase: (
    tenantId: string,
    deviceId: string,
    deviceToken: string,
    branchId: string
  ) => Promise<void> | void;
  getSyncService: () => SyncService;
  closeDatabase: () => Promise<void> | void;
}

/* ============================================================================
   GLOBAL STATE
============================================================================ */

let mainWindow: BrowserWindow | null = null;
let dbManager: DatabaseManager | null = null;

/* ============================================================================
   DATABASE MANAGER LOADER
============================================================================ */

async function loadDatabaseManager(): Promise<DatabaseManager> {
  if (dbManager) return dbManager;

  try {
    dbManager = mod as unknown as DatabaseManager;
    console.log("✅ Database manager loaded");
    return dbManager;
  } catch (error) {
    console.error("❌ Failed to load database manager", error);
    throw new Error(
      "Database manager not available. Did you run pnpm install?"
    );
  }
}

/* ============================================================================
   IPC REGISTRATION
============================================================================ */

function registerIpcHandlers() {
  console.log("🔧 Registering IPC handlers...");

  ipcMain.handle("db:initialize", async (_event, config: DatabaseConfig) => {
    try {
      if (!config?.tenantId || !config?.deviceId) {
        throw new Error("Invalid database config");
      }

      const manager = await loadDatabaseManager();
      await manager.initializeDatabase(
        config.tenantId,
        config.deviceId,
        config.deviceToken,
        config.branchId
      );

      return { success: true };
    } catch (error) {
      console.error("❌ DB init failed:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("sync:getStats", async () => {
    try {
      const manager = await loadDatabaseManager();
      const stats = manager.getSyncService().getSyncStats();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("sync:now", async () => {
    try {
      const manager = await loadDatabaseManager();
      const sync = manager.getSyncService();
      await sync.syncPendingChanges();
      await sync.pullUpdates();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("sync:retryFailed", async () => {
    try {
      const manager = await loadDatabaseManager();
      await manager.getSyncService().retryFailedSyncs();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle("sync:queueChange", async (_event, params) => {
    try {
      const { entityType, entityId, operation, payload } = params ?? {};
      if (!entityType || !entityId || !operation) {
        throw new Error("Invalid sync payload");
      }

      const manager = await loadDatabaseManager();
      manager
        .getSyncService()
        .queueChange(entityType, entityId, operation, payload);

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

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
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
    }
  });

  console.log("✅ IPC handlers registered");
}

/* ============================================================================
   WINDOW
============================================================================ */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      devTools: isDev(),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../renderer", MAIN_WINDOW_VITE_NAME, "index.html")
    );
  }

  if (process.env.NODE_ENV === "production") {
    mainWindow.webContents.closeDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/* ============================================================================
   APP LIFECYCLE
============================================================================ */

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on("window-all-closed", async () => {
  if (dbManager?.closeDatabase) {
    await dbManager.closeDatabase();
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
