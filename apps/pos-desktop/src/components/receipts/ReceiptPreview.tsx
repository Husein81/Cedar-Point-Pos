import { useReceiptData } from "@/hooks/useReceipt";
import { Button, Icon } from "@repo/ui";
import { Receipt } from "./Receipt";
import { useRef, useState } from "react";
import { usePrinterStore } from "@/store/printerStore";

interface ReceiptPreviewProps {
  orderId: string;
  isReprint?: boolean;
  onClose?: () => void;
  onPrintSuccess?: () => void;
}

/**
 * Receipt Preview Component
 *
 * Shows a preview of the receipt with print actions.
 * Used in modals for both automatic print after payment
 * and manual reprint from invoices list.
 */
export const ReceiptPreview = ({
  orderId,
  isReprint = false,
  onClose,
  onPrintSuccess,
}: ReceiptPreviewProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  const { data, isLoading, error } = useReceiptData(orderId, isReprint);
  const { defaultPrinter, silentPrint } = usePrinterStore();

  /**
   * Handle print action
   */
  const handlePrint = async () => {
    if (!receiptRef.current) return;

    setIsPrinting(true);
    setPrintError(null);

    try {
      // Check if Electron print API is available
      if (window.electron?.print) {
        const result = await window.electron.print({
          silent: silentPrint,
          printerName: defaultPrinter || undefined,
          printBackground: true,
        });

        if (result.success) {
          onPrintSuccess?.();
        } else {
          setPrintError(result.error || "Print failed");
        }
      } else {
        // Fallback to browser print (for development)
        window.print();
        onPrintSuccess?.();
      }
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : "Print failed");
    } finally {
      setIsPrinting(false);
    }
  };

  /**
   * Handle silent print (no preview, direct to printer)
   */
  const handleSilentPrint = async () => {
    if (!window.electron?.print) {
      setPrintError("Silent printing requires Electron");
      return;
    }

    setIsPrinting(true);
    setPrintError(null);

    try {
      const result = await window.electron.print({
        silent: true,
        printerName: defaultPrinter || undefined,
        printBackground: true,
      });

      if (result.success) {
        onPrintSuccess?.();
        onClose?.();
      } else {
        setPrintError(result.error || "Print failed");
      }
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : "Print failed");
    } finally {
      setIsPrinting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Icon
          name="Loader2"
          className="w-8 h-8 animate-spin text-muted-foreground"
        />
        <p className="text-sm text-muted-foreground mt-4">Loading receipt...</p>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Icon name="AlertCircle" className="w-12 h-12 text-destructive mb-4" />
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load receipt"}
        </p>
        <Button variant="outline" className="mt-4" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <Icon name="Receipt" className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold">
            Receipt Preview - #{data.order.orderNumber}
          </span>
          {isReprint && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              Reprint
            </span>
          )}
        </div>
      </div>

      {/* Receipt Preview - Scrollable */}
      <div className="flex-1 overflow-auto py-4 flex justify-center bg-gray-100">
        <div className="shadow-lg">
          <Receipt ref={receiptRef} data={data} />
        </div>
      </div>

      {/* Print Error */}
      {printError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mt-2">
          <Icon name="AlertCircle" className="w-4 h-4 inline mr-2" />
          {printError}
        </div>
      )}

      {/* Actions */}
      <div className="receipt-actions flex items-center justify-between pt-4 border-t mt-4">
        <div className="text-xs text-muted-foreground">
          {defaultPrinter ? (
            <span>
              <Icon name="Printer" className="w-3 h-3 inline mr-1" />
              {defaultPrinter}
            </span>
          ) : (
            <span>No default printer set</span>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPrinting}>
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={handleSilentPrint}
            disabled={isPrinting || !defaultPrinter}
          >
            <Icon name="Zap" className="w-4 h-4" />
            Quick Print
          </Button>

          <Button onClick={handlePrint} disabled={isPrinting}>
            {isPrinting ? (
              <>
                <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Icon name="Printer" className="w-4 h-4" />
                Print
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
