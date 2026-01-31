import { createFileRoute } from "@tanstack/react-router";
import { RefundPage } from "@/components/refunds/RefundPage";
import { ScannerRefundPage } from "@/components/refunds/ScannerRefundPage";
import { useState } from "react";
import { Icon, Shad } from "@repo/ui";

export const Route = createFileRoute("/refunds")({
  component: RefundsRoute,
});

/**
 * RefundsRoute - Entry point for refunds
 *
 * Two modes:
 * - Scanner Mode (default): Scan barcode → quick refund
 * - Order Mode: Browse orders → select items → refund
 */
function RefundsRoute() {
  const [mode, setMode] = useState<"scanner" | "orders">("scanner");

  return (
    <div className="fixed inset-x-0 top-12 bottom-8 flex flex-col w-full bg-background">
      {/* Mode Tabs */}
      <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
        <Shad.Tabs
          value={mode}
          onValueChange={(v: string) => setMode(v as typeof mode)}
        >
          <Shad.TabsList>
            <Shad.TabsTrigger value="scanner" className="gap-2">
              <Icon name="ScanLine" className="h-4 w-4" />
              Scan to Refund
            </Shad.TabsTrigger>
            <Shad.TabsTrigger value="orders" className="gap-2">
              <Icon name="Receipt" className="h-4 w-4" />
              Browse Orders
            </Shad.TabsTrigger>
          </Shad.TabsList>
        </Shad.Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === "scanner" ? <ScannerRefundPage /> : <RefundPage />}
      </div>
    </div>
  );
}
