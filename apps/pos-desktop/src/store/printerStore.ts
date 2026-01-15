import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Printer information from Electron
 */
export interface PrinterInfo {
  name: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  status: number;
}

/**
 * Print options
 */
export interface PrintOptions {
  silent?: boolean;
  printerName?: string;
  copies?: number;
  printBackground?: boolean;
}

/**
 * Print result
 */
export interface PrintResult {
  success: boolean;
  error?: string;
}

interface PrinterStoreState {
  // Available printers
  printers: PrinterInfo[];

  // Default printer for this device
  defaultPrinter: string | null;

  // Print settings
  silentPrint: boolean;
  autoPrintOnPayment: boolean;

  // Actions
  setPrinters: (printers: PrinterInfo[]) => void;
  setDefaultPrinter: (printerName: string | null) => void;
  setSilentPrint: (silent: boolean) => void;
  setAutoPrintOnPayment: (autoPrint: boolean) => void;

  // Utilities
  getDefaultPrinterInfo: () => PrinterInfo | null;
  refreshPrinters: () => Promise<void>;
}

export const usePrinterStore = create<PrinterStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      printers: [],
      defaultPrinter: null,
      silentPrint: true, // Default to silent for POS
      autoPrintOnPayment: true, // Auto-print receipts after payment

      // Actions
      setPrinters: (printers) => set({ printers }),

      setDefaultPrinter: (printerName) => set({ defaultPrinter: printerName }),

      setSilentPrint: (silent) => set({ silentPrint: silent }),

      setAutoPrintOnPayment: (autoPrint) =>
        set({ autoPrintOnPayment: autoPrint }),

      // Get the PrinterInfo for the default printer
      getDefaultPrinterInfo: () => {
        const { printers, defaultPrinter } = get();
        if (!defaultPrinter) return null;
        return printers.find((p) => p.name === defaultPrinter) || null;
      },

      // Refresh printer list from Electron
      refreshPrinters: async () => {
        if (!window.electron?.getPrinters) {
          console.warn("Electron printer API not available");
          return;
        }

        try {
          const printers = await window.electron.getPrinters();
          set({ printers });

          // If no default is set, use the system default
          const { defaultPrinter } = get();
          if (!defaultPrinter) {
            const systemDefault = printers.find((p) => p.isDefault);
            if (systemDefault) {
              set({ defaultPrinter: systemDefault.name });
            }
          }
        } catch (error) {
          console.error("Failed to get printers:", error);
        }
      },
    }),
    {
      name: "printer-settings",
      // Only persist these fields (not the printer list)
      partialize: (state) => ({
        defaultPrinter: state.defaultPrinter,
        silentPrint: state.silentPrint,
        autoPrintOnPayment: state.autoPrintOnPayment,
      }),
    }
  )
);
