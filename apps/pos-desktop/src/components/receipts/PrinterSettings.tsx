import { usePrinterStore } from "@/store/printerStore";
import { Button, Icon, Select, Switch } from "@repo/ui";
import { useEffect, useState } from "react";

/**
 * Printer Settings Component
 *
 * Allows users to:
 * - View available printers
 * - Select default printer
 * - Configure print settings
 * - Test print
 */
export const PrinterSettings = () => {
  const {
    printers,
    defaultPrinter,
    silentPrint,
    autoPrintOnPayment,
    setDefaultPrinter,
    setSilentPrint,
    setAutoPrintOnPayment,
    refreshPrinters,
  } = usePrinterStore();

  const [isLoading, setIsLoading] = useState(false);
  const [testPrintStatus, setTestPrintStatus] = useState<
    "idle" | "printing" | "success" | "error"
  >("idle");
  const [testPrintError, setTestPrintError] = useState<string | null>(null);

  // Load printers on mount
  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    setIsLoading(true);
    await refreshPrinters();
    setIsLoading(false);
  };

  const handleTestPrint = async () => {
    if (!window.electron?.print) {
      setTestPrintStatus("error");
      setTestPrintError("Electron print API not available");
      return;
    }

    setTestPrintStatus("printing");
    setTestPrintError(null);

    try {
      // For now, just test with the print dialog
      // In a future enhancement, we could print a test page HTML
      const result = await window.electron.print({
        silent: false, // Show dialog for test
        printerName: defaultPrinter || undefined,
        printBackground: true,
      });

      if (result.success) {
        setTestPrintStatus("success");
        setTimeout(() => setTestPrintStatus("idle"), 3000);
      } else {
        setTestPrintStatus("error");
        setTestPrintError(result.error || "Print failed");
      }
    } catch (error) {
      setTestPrintStatus("error");
      setTestPrintError(
        error instanceof Error ? error.message : "Print failed"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Printer Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure receipt printer for this device
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadPrinters}
          disabled={isLoading}
        >
          {isLoading ? (
            <Icon name="Loader2" className="w-4 h-4 animate-spin" />
          ) : (
            <Icon name="RefreshCw" className="w-4 h-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Printer Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Default Printer</label>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="Loader2" className="w-4 h-4 animate-spin" />
            <span>Loading printers...</span>
          </div>
        ) : printers.length === 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-600 p-3 bg-blue-50 rounded-md">
              <Icon name="Info" className="w-4 h-4" />
              <span className="text-sm">
                Using system default printer. Print will use your Windows
                default printer.
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Set your thermal printer as the Windows default printer for
              automatic printing.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Select
              placeholder="Select a printer"
              value={defaultPrinter || ""}
              onChange={(option) => setDefaultPrinter(option.value)}
              options={printers.map((printer) => ({
                label: printer.isDefault
                  ? `${printer.displayName} (System Default)`
                  : printer.displayName,
                value: printer.name,
              }))}
            />
            {defaultPrinter && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon name="Check" className="w-4 h-4 text-green-600" />
                Selected:{" "}
                {printers.find((p) => p.name === defaultPrinter)?.displayName ||
                  defaultPrinter}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print Settings */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">Print Behavior</h4>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Silent Printing</label>
            <p className="text-xs text-muted-foreground">
              Print without showing dialog
            </p>
          </div>
          <Switch checked={silentPrint} onCheckedChange={setSilentPrint} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Auto-Print on Payment</label>
            <p className="text-xs text-muted-foreground">
              Automatically print receipt when order is paid
            </p>
          </div>
          <Switch
            checked={autoPrintOnPayment}
            onCheckedChange={setAutoPrintOnPayment}
          />
        </div>
      </div>

      {/* Test Print */}
      <div className="pt-4 border-t">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleTestPrint}
            disabled={testPrintStatus === "printing" || !defaultPrinter}
          >
            {testPrintStatus === "printing" ? (
              <>
                <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Icon name="Printer" className="w-4 h-4" />
                Test Print
              </>
            )}
          </Button>

          {testPrintStatus === "success" && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Icon name="Check" className="w-4 h-4" />
              Print sent successfully
            </span>
          )}

          {testPrintStatus === "error" && (
            <span className="text-sm text-destructive flex items-center gap-1">
              <Icon name="X" className="w-4 h-4" />
              {testPrintError}
            </span>
          )}
        </div>

        {!defaultPrinter && (
          <p className="text-xs text-muted-foreground mt-2">
            Select a printer to enable test print
          </p>
        )}
      </div>
    </div>
  );
};
