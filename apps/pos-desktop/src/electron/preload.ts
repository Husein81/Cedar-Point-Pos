// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, PrinterInfo } from "electron";

/**
 * Print options interface
 */
interface PrintOptions {
  silent?: boolean;
  printerName?: string;
  copies?: number;
  printBackground?: boolean;
}

/**
 * Print result interface
 */
interface PrintResult {
  success: boolean;
  error?: string;
}

contextBridge.exposeInMainWorld("electron", {
  // Frame actions (minimize, maximize, close)
  sendFrameAction: (action: "MINIMIZE" | "MAXIMIZE" | "CLOSE") => {
    ipcRenderer.send("frame-action", action);
  },

  // Get list of available printers
  getPrinters: (): Promise<PrinterInfo[]> => {
    return ipcRenderer.invoke("get-printers");
  },

  // Print the current window content
  print: (options: PrintOptions): Promise<PrintResult> => {
    return ipcRenderer.invoke("print", options);
  },

  // Generate PDF from current content (for testing)
  printToPdf: (): Promise<{
    success: boolean;
    data?: Buffer;
    error?: string;
  }> => {
    return ipcRenderer.invoke("print-to-pdf");
  },
});
