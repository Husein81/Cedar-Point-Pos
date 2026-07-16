import { useState } from "react";
import { Button, Empty, Icon, Shad, Textarea } from "@repo/ui";
import type { RefundableInfo, RefundHistory } from "@/dto/refund.dto";
import { useRefundStore } from "@/store/refundStore";
import { useCreateRefund } from "@/hooks/useRefund";
import { CartItem } from "./CartItem";
import { RefundConfirmModal } from "./RefundConfirmModal";
import { RefundHistoryPanel } from "./RefundHistoryPanel";
import { OrderHeader } from "./RefundOrderHeader";
import {
  buildRefundLines,
  buildRefundReason,
  getRefundTotal,
  getSelectedLines,
  isFullRefund,
  REFUND_REASONS,
} from "./config";

interface RefundCartProps {
  info: RefundableInfo | undefined;
  isLoading: boolean;
  isError: boolean;
  history: RefundHistory[];
}

const CenteredState = ({
  icon,
  iconClass,
  title,
  description,
}: {
  icon: string;
  iconClass: string;
  title: string;
  description: string;
}) => (
  <div className="flex-1 grid place-items-center bg-muted/10">
    <div className="max-w-sm text-center space-y-3">
      <div className="mx-auto h-14 w-14 rounded-xl bg-muted/40 grid place-items-center">
        <Icon name={icon} className={`h-6 w-6 ${iconClass}`} />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  </div>
);

export const RefundCart = ({
  info,
  isLoading,
  isError,
  history,
}: RefundCartProps) => {
  const selectedOrderId = useRefundStore((s) => s.selectedOrderId);
  const quantities = useRefundStore((s) => s.quantities);
  const reason = useRefundStore((s) => s.reason);
  const note = useRefundStore((s) => s.note);
  const setQuantity = useRefundStore((s) => s.setQuantity);
  const setQuantities = useRefundStore((s) => s.setQuantities);
  const setReason = useRefundStore((s) => s.setReason);
  const setNote = useRefundStore((s) => s.setNote);
  const resetDraft = useRefundStore((s) => s.resetDraft);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const createRefundMutation = useCreateRefund();

  if (!selectedOrderId) {
    return (
      <CenteredState
        icon="ReceiptText"
        iconClass="text-muted-foreground"
        title="Select an Order"
        description="Choose an order on the left to view items and create a refund."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 grid place-items-center bg-muted/10">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Icon name="LoaderCircle" className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading order details...</span>
        </div>
      </div>
    );
  }

  if (isError || !info) {
    return (
      <CenteredState
        icon="CircleAlert"
        iconClass="text-destructive"
        title="Something went wrong"
        description="Failed to load the order's refund details. Try selecting it again."
      />
    );
  }

  if (!info.canRefund) {
    return (
      <div className="flex-1 flex flex-col">
        <OrderHeader orderDetails={info} />
        <CenteredState
          icon="Ban"
          iconClass="text-muted-foreground"
          title="Not Refundable"
          description="Only paid or completed orders can be refunded."
        />
      </div>
    );
  }

  if (info.isFullyRefunded) {
    return (
      <div className="flex-1 flex flex-col">
        <OrderHeader orderDetails={info} />
        <CenteredState
          icon="CircleCheck"
          iconClass="text-green-600 dark:text-green-500"
          title="Fully Refunded"
          description="This order has no remaining refundable items."
        />
        {history.length > 0 && <RefundHistoryPanel history={history} />}
      </div>
    );
  }

  const lines = buildRefundLines(info.items, quantities);
  const selectedLines = getSelectedLines(lines);
  const refundTotal = getRefundTotal(lines);
  const fullRefund = isFullRefund(lines);
  const hasRefundableItems = lines.some((l) => l.refundableQuantity > 0);
  const canProcess =
    selectedLines.length > 0 && !createRefundMutation.isPending;
  // The free-text note only applies to the "Other" reason.
  const effectiveNote = reason === "OTHER" ? note : "";
  const reasonText = buildRefundReason(reason, effectiveNote);

  const handleSelectAll = () => {
    setQuantities(
      Object.fromEntries(
        info.items
          .filter((item) => item.refundableQuantity > 0)
          .map((item) => [item.orderItemId, item.refundableQuantity]),
      ),
    );
  };

  const handleClearSelection = () => setQuantities({});

  const handleProcessRefund = async () => {
    if (!canProcess) return;

    try {
      await createRefundMutation.mutateAsync({
        orderId: selectedOrderId,
        reason: reasonText,
        items: selectedLines.map((line) => ({
          orderItemId: line.orderItemId,
          quantity: line.refundQuantity,
        })),
      });
      setShowConfirmModal(false);
      resetDraft();
    } catch {
      // Error toast is surfaced by useCreateRefund; keep the modal open so
      // the cashier can retry.
    }
  };

  return (
    <div className="relative flex-1 flex flex-col bg-background overflow-hidden">
      <OrderHeader orderDetails={info} />

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-border/40 bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={!hasRefundableItems}
          >
            <Icon name="SquareCheck" className="w-3.5 h-3.5" />
            Select all
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
            disabled={selectedLines.length === 0}
          >
            <Icon name="X" className="w-3.5 h-3.5" />
            Clear
          </Button>

          <span className="ml-auto text-xs text-muted-foreground">
            {selectedLines.length} of {lines.length} selected
          </span>
        </div>
      </div>

      {/* Items + history */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Shad.ScrollArea className="h-full">
          <div className="py-1">
            {lines.length === 0 ? (
              <div className="p-6">
                <Empty
                  title="No refundable items"
                  description="All items in this order have been refunded."
                />
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {lines.map((line) => (
                  <CartItem
                    key={line.orderItemId}
                    line={line}
                    onToggle={() =>
                      setQuantity(
                        line.orderItemId,
                        line.refundQuantity > 0 ? 0 : line.refundableQuantity,
                      )
                    }
                    onQuantityChange={(qty) =>
                      setQuantity(
                        line.orderItemId,
                        Math.max(0, Math.min(qty, line.refundableQuantity)),
                      )
                    }
                  />
                ))}
              </div>
            )}

            {history.length > 0 && (
              <div className="px-5 pt-4 pb-2">
                <RefundHistoryPanel history={history} />
              </div>
            )}
          </div>
        </Shad.ScrollArea>
      </div>

      {/* Bottom summary */}
      <div className="shrink-0 border-t border-border/60 bg-background px-5 py-4 space-y-3">
        {/* Reason chips */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Reason (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {REFUND_REASONS.map((r) => (
              <Button
                key={r.value}
                variant={reason === r.value ? "default" : "outline"}
                size="sm"
                onClick={() => setReason(reason === r.value ? "" : r.value)}
              >
                <Icon name={r.icon} className="w-3.5 h-3.5" />
                {r.label}
              </Button>
            ))}
          </div>
          {reason === "OTHER" && (
            <Textarea
              placeholder="Describe the reason..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-14 resize-none text-sm"
            />
          )}
        </div>

        {/* Refund total card */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Refund Total</p>
                {selectedLines.length > 0 && (
                  <span
                    className={
                      fullRefund
                        ? "text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-md bg-destructive/15 text-destructive border border-destructive/25"
                        : "text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                    }
                  >
                    {fullRefund ? "Full" : "Partial"}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedLines.length} item
                {selectedLines.length !== 1 ? "s" : ""}
              </p>
            </div>

            <p className="text-2xl font-bold text-destructive tabular-nums">
              ${refundTotal.toFixed(2)}
            </p>
          </div>

          {!fullRefund && selectedLines.length > 0 && (
            <div className="pt-2 border-t border-destructive/10 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Order total</span>
                <span className="font-medium tabular-nums">
                  ${info.orderTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  Remaining after refund
                </span>
                <span className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                  ${(info.orderTotal - refundTotal).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <Button
          size="lg"
          variant="destructive"
          className="w-full h-11 text-sm font-semibold"
          disabled={!canProcess}
          onClick={() => setShowConfirmModal(true)}
        >
          <Icon name="RotateCcw" className="w-4 h-4" />
          {fullRefund ? "Process Full Refund" : "Process Partial Refund"}
        </Button>
      </div>

      <RefundConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleProcessRefund}
        lines={selectedLines}
        total={refundTotal}
        reason={reasonText}
        isProcessing={createRefundMutation.isPending}
        isFullRefund={fullRefund}
      />
    </div>
  );
};
