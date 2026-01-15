type UnsubscribeFunction = () => void;
type FrameWindowAction = "CLOSE" | "MAXIMIZE" | "MINIMIZE";

/**
 * Printer information from Electron
 */
interface ElectronPrinterInfo {
  name: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  status: number;
}

/**
 * Print options
 */
interface PrintOptions {
  silent?: boolean;
  printerName?: string;
  copies?: number;
  printBackground?: boolean;
}

/**
 * Print result
 */
interface PrintResult {
  success: boolean;
  error?: string;
}

interface Window {
  electron: {
    // Frame actions
    sendFrameAction: (payload: FrameWindowAction) => void;

    // Printer functions
    getPrinters: () => Promise<ElectronPrinterInfo[]>;
    print: (options: PrintOptions) => Promise<PrintResult>;
    printToPdf: () => Promise<{
      success: boolean;
      data?: Buffer;
      error?: string;
    }>;
  };
}
