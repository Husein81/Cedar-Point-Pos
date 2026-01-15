import { app, BrowserWindow, ipcMain, PrinterInfo } from "electron";
import path from "node:path";
import { isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";

let mainWindow: BrowserWindow | null = null;

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// ✅ IPC HANDLER: Frame Actions
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

// ✅ IPC HANDLER: Get Printers
// Note: webContents.getPrinters() was removed in Electron v33+
// We now use a workaround: print dialog or rely on system default printer
ipcMain.handle("get-printers", async (): Promise<PrinterInfo[]> => {
  // In modern Electron, we can't enumerate printers directly
  // Return empty array - the UI should allow entering printer name manually
  // or rely on system default printer
  console.log(
    "get-printers: Using system default printer (printer enumeration not available in Electron 39+)"
  );
  return [];
});

// ✅ IPC HANDLER: Print
ipcMain.handle(
  "print",
  async (
    _event,
    options: {
      silent?: boolean;
      printerName?: string;
      copies?: number;
      printBackground?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!mainWindow) {
      return { success: false, error: "No window available" };
    }

    return new Promise((resolve) => {
      try {
        mainWindow!.webContents.print(
          {
            silent: options.silent ?? true,
            printBackground: options.printBackground ?? true,
            deviceName: options.printerName,
            copies: options.copies ?? 1,
            // Thermal printer settings (80mm width)
            margins: {
              marginType: "none",
            },
            pageSize: {
              width: 80000, // 80mm in microns
              height: 297000, // Variable height (will be trimmed)
            },
          },
          (success, failureReason) => {
            if (success) {
              resolve({ success: true });
            } else {
              resolve({
                success: false,
                error: failureReason || "Print failed",
              });
            }
          }
        );
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : "Print error",
        });
      }
    });
  }
);

// ✅ IPC HANDLER: Print to PDF (for testing/preview)
ipcMain.handle(
  "print-to-pdf",
  async (): Promise<{ success: boolean; data?: Buffer; error?: string }> => {
    if (!mainWindow) {
      return { success: false, error: "No window available" };
    }

    try {
      const data = await mainWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: {
          width: 80000,
          height: 297000,
        },
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "PDF generation failed",
      };
    }
  }
);

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      devTools: isDev(),
    },
  });

  mainWindow.setMinimumSize(800, 600);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (process.env.NODE_ENV === "production") {
    mainWindow.webContents.closeDevTools();
  }
};
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
