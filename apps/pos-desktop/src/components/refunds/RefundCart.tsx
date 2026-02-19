import { useRefundStore } from "@/store/refundStore";
import { useShiftStore } from "@/store/shiftStore";
import { PaymentMethod } from "@repo/types";
import { Button, cn, Empty, Icon, Shad, Textarea } from "@repo/ui";
import { useState } from "react";
import { CartItem } from "./CartItem";
import { RefundConfirmModal } from "./RefundConfirmModal";
import { RefundHistoryPanel } from "./RefundHistoryPanel";
import { useCreateRefund } from "@/hooks/useRefund";
import { OrderHeader } from "./RefundOrderHeader";
import { toast } from "sonner";

type Props = {
  onRefundComplete: () => void;
};

export const RefundCart = ({ onRefundComplete }: Props) => {
  const {
    selectedOrderId,
    selectedOrderDetails,
    selectedOrderError,
    refundCartItems,
    refundReason,
    refundPaymentMethod,
    setRefundReason,
    setRefundPaymentMethod,
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

  const { currentShiftId, currentDeviceId } = useShiftStore();

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const createRefundMutation = useCreateRefund();

  const selectedItems = getSelectedItems();
  const refundTotal = getRefundTotal();

  const handleProcessRefund = async () => {
    if (!selectedOrderId || !canProcessRefund()) return;

    // Guard: require active shift + device context
    if (!currentShiftId || !currentDeviceId) {
      toast.error(
        "No active shift. Please open a shift before processing refunds.",
      );
      return;
    }

    try {
      await createRefundMutation.mutateAsync({
        orderId: selectedOrderId,
        reason: refundReason || undefined,
        items: selectedItems.map((item) => ({
          orderItemId: item.orderItemId,
          quantity: item.refundQuantity,
        })),
        refundPayments: [
          {
            method: refundPaymentMethod,
            amount: refundTotal,
          },
        ],
        ...(currentShiftId ? { shiftId: currentShiftId } : {}),
        ...(currentDeviceId ? { deviceId: currentDeviceId } : {}),
        idempotencyKey: crypto.randomUUID(),
      });

      setShowConfirmModal(false);
      onRefundComplete();
    } catch (error: any) {
      console.error("Refund failed:", error);
    }
  };

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

  if (!selectedOrderId) {
    return (
      <div className="flex-1 grid place-items-center bg-muted/10">
        <div className="max-w-sm text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-xl bg-muted/40 grid place-items-center">
            <Icon
              name="ReceiptText"
              className="h-6 w-6 text-muted-foreground"
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

  if (selectedOrderError) {
    return (
      <div className="flex-1 grid place-items-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-xl bg-destructive/10 grid place-items-center">
            <Icon name="CircleAlert" className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {selectedOrderError}
          </p>
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
            <div className="mx-auto h-14 w-14 rounded-xl bg-green-500/10 grid place-items-center">
              <Icon name="CircleCheck" className="h-6 w-6 text-green-600" />
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
      <div className="px-5 py-3 border-b border-border/40 bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllItems}
            disabled={!hasRefundableItems()}
          >
            <Icon name="SquareCheck" className="w-3.5 h-3.5" />
            Select all
          </Button>

          <Button variant="outline" size="sm" onClick={deselectAllItems}>
            <Icon name="X" className="w-3.5 h-3.5" />
            Clear
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedItems.length} of {refundCartItems.length} selected
            </span>
          </div>
        </div>
      </div>

      {/* Items + History */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Shad.ScrollArea className="h-full">
          <div className="py-1">
            {refundCartItems.length === 0 ? (
              <div className="p-6">
                <Empty
                  title="No refundable items"
                  description="All items in this order have been refunded."
                />
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {refundCartItems.map((item) => (
                  <CartItem
                    key={item.orderItemId}
                    item={item}
                    onToggle={() => toggleItemSelection(item.orderItemId)}
                    onQuantityChange={(qty) =>
                      setRefundQuantity(item.orderItemId, qty)
                    }
                  />
                ))}
              </div>
            )}

            {refundHistory.length > 0 && (
              <div className="px-5 pt-4 pb-2">
                <RefundHistoryPanel />
              </div>
            )}
          </div>
        </Shad.ScrollArea>
      </div>

      {/* Bottom Summary */}
      <div className="shrink-0 border-t border-border/60 bg-background px-5 py-5 space-y-4">
        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Reason (optional)
          </label>
          <Textarea
            placeholder="Why is this being refunded?"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            className="h-14 resize-none text-sm"
          />
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Refund Method
          </label>
          <div className="flex gap-2">
            {(
              [
                {
                  value: "CASH" as PaymentMethod,
                  label: "Cash",
                  icon: "Banknote",
                },
                {
                  value: "CARD" as PaymentMethod,
                  label: "Card",
                  icon: "CreditCard",
                },
                {
                  value: "ONLINE" as PaymentMethod,
                  label: "Online",
                  icon: "Smartphone",
                },
              ] as const
            ).map((method) => (
              <Button
                key={method.value}
                variant={
                  refundPaymentMethod === method.value ? "default" : "outline"
                }
                size="sm"
                className={cn(
                  "flex-1",
                  refundPaymentMethod === method.value &&
                    "ring-2 ring-primary/20",
                )}
                onClick={() => setRefundPaymentMethod(method.value)}
              >
                <Icon name={method.icon} className="w-4 h-4" />
                {method.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Refund Total Card */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Refund Total</p>
                {selectedItems.length > 0 &&
                  (!isFullRefund() ? (
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 border border-amber-500/25">
                      Partial
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-md bg-destructive/15 text-destructive border border-destructive/25">
                      Full
                    </span>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedItems.length} item
                {selectedItems.length !== 1 ? "s" : ""}
              </p>
            </div>

            <p className="text-2xl font-bold text-destructive tabular-nums">
              ${refundTotal.toFixed(2)}
            </p>
          </div>

          {!isFullRefund() &&
            selectedOrderDetails &&
            selectedItems.length > 0 && (
              <div className="pt-2 border-t border-destructive/10 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Order total</span>
                  <span className="font-medium tabular-nums">
                    ${selectedOrderDetails.orderTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Remaining after refund
                  </span>
                  <span className="font-semibold text-amber-700 tabular-nums">
                    $
                    {(selectedOrderDetails.orderTotal - refundTotal).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
        </div>

        {/* Error */}
        {processError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <div className="flex gap-2 items-start">
              <Icon name="CircleAlert" className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium">{processError}</span>
            </div>
          </div>
        )}

        <Button
          size="lg"
          variant="destructive"
          className="w-full h-11 text-sm font-semibold"
          disabled={!canProcessRefund()}
          onClick={() => setShowConfirmModal(true)}
        >
          <Icon name="RotateCcw" className="w-4 h-4" />
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
        paymentMethod={refundPaymentMethod}
        isProcessing={processStatus === "processing"}
        isFullRefund={isFullRefund()}
      />
    </div>
  );
};
