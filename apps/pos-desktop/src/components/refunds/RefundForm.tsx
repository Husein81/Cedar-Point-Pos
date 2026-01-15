import { useState, useMemo } from "react";
import { Button, Icon, Separator, Shad, Badge, Textarea } from "@repo/ui";
import { cn } from "@repo/ui";
import { useRefundableInfo, useCreateRefund } from "@/hooks/useRefund";
import { useModalStore } from "@/store/modalStore";
import { formatPrice } from "../orders/config";

type RefundItemSelection = {
  orderItemId: string;
  quantity: number;
};

type Props = {
  orderId: string;
  onSuccess?: () => void;
};

const REFUND_REASONS = [
  { value: "DAMAGED", label: "Damaged item" },
  { value: "WRONG_ITEM", label: "Wrong item delivered" },
  { value: "CUSTOMER_REQUEST", label: "Customer changed mind" },
  { value: "QUALITY_ISSUE", label: "Quality issue" },
  { value: "OTHER", label: "Other" },
];

export const RefundForm = ({ orderId, onSuccess }: Props) => {
  const { closeModal } = useModalStore();
  const { data: refundableInfo, isLoading } = useRefundableInfo(orderId);
  const createRefundMutation = useCreateRefund();

  const [selectedItems, setSelectedItems] = useState<
    Map<string, RefundItemSelection>
  >(new Map());
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [step, setStep] = useState<"select" | "confirm">("select");

  // Calculate refund total
  const refundTotal = useMemo(() => {
    if (!refundableInfo) return 0;

    let total = 0;
    selectedItems.forEach((selection) => {
      const item = refundableInfo.items.find(
        (i) => i.orderItemId === selection.orderItemId
      );
      if (item) {
        total += selection.quantity * item.unitPrice;
      }
    });
    return total;
  }, [selectedItems, refundableInfo]);

  const hasSelection = selectedItems.size > 0 && refundTotal > 0;

  const handleQuantityChange = (orderItemId: string, quantity: number) => {
    const item = refundableInfo?.items.find(
      (i) => i.orderItemId === orderItemId
    );
    if (!item) return;

    const newMap = new Map(selectedItems);

    if (quantity <= 0) {
      newMap.delete(orderItemId);
    } else {
      const clampedQty = Math.min(quantity, item.refundableQuantity);
      newMap.set(orderItemId, { orderItemId, quantity: clampedQty });
    }

    setSelectedItems(newMap);
  };

  const handleSelectAll = () => {
    if (!refundableInfo) return;

    const newMap = new Map<string, RefundItemSelection>();
    refundableInfo.items.forEach((item) => {
      if (item.refundableQuantity > 0) {
        newMap.set(item.orderItemId, {
          orderItemId: item.orderItemId,
          quantity: item.refundableQuantity,
        });
      }
    });
    setSelectedItems(newMap);
  };

  const handleClearSelection = () => {
    setSelectedItems(new Map());
  };

  const handleSubmit = async () => {
    if (!hasSelection) return;

    const items = Array.from(selectedItems.values());
    const refundReason = notes ? `${reason}: ${notes}` : reason;

    try {
      await createRefundMutation.mutateAsync({
        orderId,
        reason: refundReason || undefined,
        items,
      });

      onSuccess?.();
      closeModal();
    } catch (error) {
      console.error("Refund failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon
          name="LoaderCircle"
          className="w-6 h-6 animate-spin text-primary"
        />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!refundableInfo) {
    return (
      <div className="text-center py-8">
        <Icon
          name="AlertCircle"
          className="w-8 h-8 text-destructive mx-auto mb-2"
        />
        <p className="text-destructive">Failed to load order information</p>
      </div>
    );
  }

  if (!refundableInfo.canRefund) {
    return (
      <div className="text-center py-8">
        <Icon
          name="Ban"
          className="w-8 h-8 text-muted-foreground mx-auto mb-2"
        />
        <p className="text-muted-foreground">
          This order cannot be refunded. Only completed orders can be refunded.
        </p>
      </div>
    );
  }

  if (refundableInfo.isFullyRefunded) {
    return (
      <div className="text-center py-8">
        <Icon
          name="CircleCheck"
          className="w-8 h-8 text-green-500 mx-auto mb-2"
        />
        <p className="text-muted-foreground">
          This order has been fully refunded.
        </p>
      </div>
    );
  }

  // Confirmation step
  if (step === "confirm") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10">
            <Icon name="TriangleAlert" className="w-5 h-5 text-amber-500" />
          </div>
          <Shad.DialogTitle>Confirm Refund</Shad.DialogTitle>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm text-muted-foreground">
            You are about to refund the following items. This action cannot be
            undone.
          </p>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {Array.from(selectedItems.values()).map((selection) => {
            const item = refundableInfo.items.find(
              (i) => i.orderItemId === selection.orderItemId
            );
            if (!item) return null;

            return (
              <div
                key={selection.orderItemId}
                className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-md"
              >
                <div>
                  <p className="font-medium text-sm">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {selection.quantity} × ${formatPrice(item.unitPrice)}
                  </p>
                </div>
                <span className="font-semibold">
                  ${formatPrice(selection.quantity * item.unitPrice)}
                </span>
              </div>
            );
          })}
        </div>

        {reason && (
          <div className="py-2">
            <p className="text-xs text-muted-foreground">Reason</p>
            <p className="text-sm font-medium">
              {REFUND_REASONS.find((r) => r.value === reason)?.label || reason}
              {notes && `: ${notes}`}
            </p>
          </div>
        )}

        <Separator />

        <div className="flex justify-between items-center py-2">
          <span className="text-lg font-semibold">Total Refund</span>
          <span className="text-2xl font-bold text-destructive">
            ${formatPrice(refundTotal)}
          </span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep("select")}
          >
            Back
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleSubmit}
            isSubmitting={createRefundMutation.isPending}
          >
            <Icon name="RotateCcw" className="w-4 h-4" />
            Process Refund
          </Button>
        </div>
      </div>
    );
  }

  // Selection step
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Icon name="RotateCcw" className="w-5 h-5 text-primary" />
        </div>
        <div>
          <Shad.DialogTitle>Create Refund</Shad.DialogTitle>
          <p className="text-sm text-muted-foreground">
            Order #{refundableInfo.orderNumber || orderId.slice(0, 8)}
          </p>
        </div>
      </div>

      {/* Order Total Info */}
      <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
        <span className="text-sm text-muted-foreground">Order Total</span>
        <span className="font-semibold">
          ${formatPrice(refundableInfo.orderTotal)}
        </span>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          <Icon name="SquareCheck" className="w-4 h-4" />
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearSelection}
          disabled={selectedItems.size === 0}
        >
          <Icon name="X" className="w-4 h-4" />
          Clear
        </Button>
      </div>

      <Separator />

      {/* Items List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        <p className="text-sm font-medium text-muted-foreground">
          Select items to refund
        </p>
        {refundableInfo.items.map((item) => {
          const selection = selectedItems.get(item.orderItemId);
          const isSelected = !!selection;
          const selectedQty = selection?.quantity || 0;

          return (
            <div
              key={item.orderItemId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:bg-muted/50",
                item.refundableQuantity <= 0 && "opacity-50"
              )}
            >
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">
                    {item.productName}
                  </p>
                  {item.refundedQuantity > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {item.refundedQuantity} refunded
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  ${formatPrice(item.unitPrice)} × {item.quantity} ordered
                </p>
                {item.refundableQuantity > 0 && (
                  <p className="text-xs text-green-600">
                    {item.refundableQuantity} available to refund
                  </p>
                )}
              </div>

              {/* Quantity Controls */}
              {item.refundableQuantity > 0 ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      handleQuantityChange(item.orderItemId, selectedQty - 1)
                    }
                    disabled={selectedQty <= 0}
                  >
                    <Icon name="Minus" className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center font-mono font-semibold">
                    {selectedQty}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      handleQuantityChange(item.orderItemId, selectedQty + 1)
                    }
                    disabled={selectedQty >= item.refundableQuantity}
                  >
                    <Icon name="Plus" className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Fully Refunded
                </Badge>
              )}

              {/* Item Subtotal */}
              {isSelected && (
                <div className="text-right">
                  <p className="font-semibold text-destructive">
                    -${formatPrice(selectedQty * item.unitPrice)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Refund Reason */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Refund Reason
        </label>
        <div className="grid grid-cols-2 gap-2">
          {REFUND_REASONS.map((r) => (
            <Button
              key={r.value}
              variant={reason === r.value ? "default" : "outline"}
              size="sm"
              className="justify-start"
              onClick={() => setReason(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Notes */}
      {reason === "OTHER" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Additional Notes
          </label>
          <Textarea
            placeholder="Enter additional details..."
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNotes(e.target.value)
            }
            rows={2}
          />
        </div>
      )}

      <Separator />

      {/* Refund Summary */}
      <div className="flex justify-between items-center py-2">
        <span className="text-lg font-semibold">Refund Total</span>
        <span
          className={cn(
            "text-2xl font-bold",
            refundTotal > 0 ? "text-destructive" : "text-muted-foreground"
          )}
        >
          ${formatPrice(refundTotal)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={() => setStep("confirm")}
          disabled={!hasSelection}
        >
          <Icon name="ArrowRight" className="w-4 h-4" />
          Review Refund
        </Button>
      </div>
    </div>
  );
};
