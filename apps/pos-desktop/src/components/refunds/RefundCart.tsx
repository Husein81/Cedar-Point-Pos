import { useRefundStore } from "@/store/refundStore";
import { Button, Icon, Separator, Shad, Textarea } from "@repo/ui";
import { useState, useCallback, useMemo } from "react";
import { CartItem } from "./CartItem";
import { RefundConfirmModal } from "./RefundConfirmModal";
import { RefundHistoryPanel } from "./RefundHistoryPanel";
import { useCreateRefund } from "@/hooks/useRefund";

interface RefundCartProps {
  onRefundComplete: () => void;
}

export const RefundCart = ({ onRefundComplete }: RefundCartProps) => {
  const {
    selectedOrderId,
    selectedOrderDetails,
    selectedOrderLoading,
    selectedOrderError,
    refundCartItems,
    refundReason,
    setRefundReason,
    setRefundQuantity,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    getSelectedItems,
    getRefundTotal,
    canProcessRefund,
    hasRefundableItems,
    isFullRefund,
    refundHistory,
  } = useRefundStore();

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ✅ OPTIMIZED: Use React Query mutation with optimistic updates
  const createRefundMutation = useCreateRefund();

  const selectedItems = getSelectedItems();
  const refundTotal = getRefundTotal();

  // ✅ OPTIMIZED: Memoize callback to prevent unnecessary re-renders
  const handleProcessRefund = useCallback(async () => {
    if (!selectedOrderId || !canProcessRefund()) return;

    try {
      await createRefundMutation.mutateAsync({
        orderId: selectedOrderId,
        reason: refundReason || undefined,
        items: selectedItems.map((item) => ({
          orderItemId: item.orderItemId,
          quantity: item.refundQuantity,
        })),
      });

      setShowConfirmModal(false);
      onRefundComplete();
    } catch (error: any) {
      console.error("Refund failed:", error);
      // Error is handled by React Query mutation
    }
  }, [
    selectedOrderId,
    refundReason,
    selectedItems,
    canProcessRefund,
    createRefundMutation,
    onRefundComplete,
  ]);

  // ✅ OPTIMIZED: Derive processing state from mutation
  const processStatus = createRefundMutation.isPending
    ? "processing"
    : createRefundMutation.isSuccess
      ? "success"
      : createRefundMutation.isError
        ? "error"
        : "idle";

  const processError = createRefundMutation.error
    ? (createRefundMutation.error as any)?.response?.data?.message ||
      "Refund failed. Please try again."
    : null;

  // ─────────────────────────────
  // EMPTY / LOADING / ERROR STATES
  // ─────────────────────────────
  if (!selectedOrderId) {
    return (
      <div className="flex-1 grid place-items-center bg-muted/10">
        <div className="max-w-sm text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted/40 grid place-items-center">
            <Icon
              name="ReceiptText"
              className="h-8 w-8 text-muted-foreground"
            />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">Select an Order</p>
            <p className="text-sm text-muted-foreground">
              Choose an order on the left to view items and create a refund.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedOrderLoading) {
    return (
      <div className="flex-1 grid place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon name="LoaderCircle" className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading order...</span>
        </div>
      </div>
    );
  }

  if (selectedOrderError) {
    return (
      <div className="flex-1 grid place-items-center p-6">
        <div className="max-w-sm text-center space-y-2 text-destructive">
          <Icon name="AlertCircle" className="h-7 w-7 mx-auto" />
          <p className="text-sm font-medium">{selectedOrderError}</p>
        </div>
      </div>
    );
  }

  // Fully refunded
  if (selectedOrderDetails?.isFullyRefunded) {
    return (
      <div className="flex-1 flex flex-col">
        {selectedOrderDetails && (
          <OrderHeader orderDetails={selectedOrderDetails} />
        )}

        <div className="flex-1 grid place-items-center bg-muted/10">
          <div className="max-w-sm text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-green-500/10 grid place-items-center">
              <Icon name="CircleCheck" className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-green-700">
                Fully Refunded
              </p>
              <p className="text-sm text-muted-foreground">
                This order has no remaining refundable items.
              </p>
            </div>
          </div>
        </div>

        {refundHistory.length > 0 && <RefundHistoryPanel />}
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      {selectedOrderDetails && (
        <OrderHeader orderDetails={selectedOrderDetails} />
      )}

      {/* Toolbar */}
      <div className="px-4 py-2 border-b bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllItems}
            disabled={!hasRefundableItems()}
            className="h-9"
          >
            Select all
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={deselectAllItems}
            className="h-9"
          >
            Clear
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Selected</span>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
              {selectedItems.length}/{refundCartItems.length}
            </span>
          </div>
        </div>
      </div>

      {/* Items + History */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Shad.ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {refundCartItems.length === 0 ? (
              <div className="h-32 grid place-items-center text-muted-foreground">
                <span className="text-sm">No items available for refund</span>
              </div>
            ) : (
              refundCartItems.map((item) => (
                <CartItem
                  key={item.orderItemId}
                  item={item}
                  onToggle={() => toggleItemSelection(item.orderItemId)}
                  onQuantityChange={(qty) =>
                    setRefundQuantity(item.orderItemId, qty)
                  }
                />
              ))
            )}

            {refundHistory.length > 0 && (
              <div className="pt-2">
                <RefundHistoryPanel />
              </div>
            )}
          </div>
        </Shad.ScrollArea>
      </div>

      <Separator className="shrink-0" />

      {/* Bottom Summary */}
      <div className="shrink-0 border-t bg-background px-4 py-4 space-y-3">
        <div className="grid gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Reason (optional)
          </label>
          <Textarea
            placeholder="Why is this being refunded?"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            className="h-14 resize-none text-sm"
          />
        </div>

        {/* Totals */}
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Refund amount</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedItems.length} item
                {selectedItems.length !== 1 ? "s" : ""}
              </p>
            </div>

            <p className="text-3xl font-bold text-destructive tabular-nums">
              ${refundTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Error */}
        {processError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex gap-2">
              <Icon name="AlertCircle" className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium">{processError}</span>
            </div>
          </div>
        )}

        <Button
          size="lg"
          variant="destructive"
          className="w-full h-12 text-base font-semibold"
          disabled={!canProcessRefund()}
          onClick={() => setShowConfirmModal(true)}
        >
          <Icon name="RotateCcw" className="w-5 h-5 mr-2" />
          {isFullRefund() ? "Process Full Refund" : "Process Partial Refund"}
        </Button>
      </div>

      <RefundConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleProcessRefund}
        items={selectedItems}
        total={refundTotal}
        reason={refundReason}
        isProcessing={processStatus === "processing"}
        isFullRefund={isFullRefund()}
      />
    </div>
  );
};

// ─────────────────────────────
// Sub Components
// ─────────────────────────────

interface OrderHeaderProps {
  orderDetails: {
    orderNumber: string | null;
    orderTotal: number;
    totalRefundable: number;
  };
}

const OrderHeader = ({ orderDetails }: OrderHeaderProps) => (
  <div className="px-4 py-4 border-b bg-background">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Order</p>
        <h2 className="text-lg font-bold">
          #{orderDetails.orderNumber || "N/A"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Original:{" "}
          <span className="font-semibold text-foreground">
            ${orderDetails.orderTotal.toFixed(2)}
          </span>
        </p>
      </div>

      <div className="rounded-lg border bg-primary/5 border-primary/20 px-3 py-2 text-right">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Refundable
        </p>
        <p className="text-2xl font-bold text-primary tabular-nums">
          ${orderDetails.totalRefundable.toFixed(2)}
        </p>
      </div>
    </div>
  </div>
);
