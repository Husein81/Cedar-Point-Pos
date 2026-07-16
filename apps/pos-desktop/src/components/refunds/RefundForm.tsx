import { useState, useMemo } from "react";
import { Button, Icon, Shad, Badge, Textarea } from "@repo/ui";
import { cn } from "@repo/ui";
import { useRefundableInfo, useCreateRefund } from "@/hooks/useRefund";
import { useModalStore } from "@/store/modalStore";
import { formatPrice } from "../orders/config";
import { buildRefundReason, getReasonLabel, REFUND_REASONS } from "./config";

type RefundItemSelection = {
  orderItemId: string;
  quantity: number;
};

type Props = {
  orderId: string;
  onSuccess?: () => void;
};

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
        (i) => i.orderItemId === selection.orderItemId,
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
      (i) => i.orderItemId === orderItemId,
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

    try {
      await createRefundMutation.mutateAsync({
        orderId,
        // The free-text note only applies to the "Other" reason.
        reason: buildRefundReason(reason, reason === "OTHER" ? notes : ""),
        items,
      });

      onSuccess?.();
      closeModal();
    } catch {
      // Error toast is surfaced by useCreateRefund; keep the modal open so
      // the cashier can retry.
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon
          name="LoaderCircle"
          className="w-5 h-5 animate-spin text-muted-foreground"
        />
        <span className="ml-2.5 text-sm text-muted-foreground">
          Loading order details…
        </span>
      </div>
    );
  }

  if (!refundableInfo) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="mx-auto h-12 w-12 rounded-xl bg-destructive/10 grid place-items-center">
          <Icon name="CircleAlert" className="w-5 h-5 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">
          Failed to load order information
        </p>
      </div>
    );
  }

  if (!refundableInfo.canRefund) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="mx-auto h-12 w-12 rounded-xl bg-muted/40 grid place-items-center">
          <Icon name="Ban" className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Only completed orders can be refunded.
        </p>
      </div>
    );
  }

  if (refundableInfo.isFullyRefunded) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="mx-auto h-12 w-12 rounded-xl bg-green-500/10 grid place-items-center">
          <Icon name="CircleCheck" className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-sm text-muted-foreground">
          This order has been fully refunded.
        </p>
      </div>
    );
  }

  // ── Confirmation Step ──
  if (step === "confirm") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10">
            <Icon name="TriangleAlert" className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <Shad.DialogTitle className="text-base">
              Confirm Refund
            </Shad.DialogTitle>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Items Summary */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="divide-y divide-border/40">
            {Array.from(selectedItems.values()).map((selection) => {
              const item = refundableInfo.items.find(
                (i) => i.orderItemId === selection.orderItemId,
              );
              if (!item) return null;

              return (
                <div
                  key={selection.orderItemId}
                  className="flex justify-between items-center px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {selection.quantity} × ${formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <span className="font-semibold text-sm tabular-nums">
                    ${formatPrice(selection.quantity * item.unitPrice)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reason */}
        {reason && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Reason
            </p>
            <p className="text-sm">
              {getReasonLabel(reason)}
              {notes && `: ${notes}`}
            </p>
          </div>
        )}

        {/* Total */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Refund Total</span>
            <span className="text-xl font-bold text-destructive tabular-nums">
              ${formatPrice(refundTotal)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-10"
            onClick={() => setStep("select")}
          >
            Back
          </Button>
          <Button
            variant="destructive"
            className="flex-1 h-10"
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

  // ── Selection Step ──
  const refundableItems = refundableInfo.items.filter(
    (i) => i.refundableQuantity > 0,
  );
  const fullyRefundedItems = refundableInfo.items.filter(
    (i) => i.refundableQuantity <= 0,
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Icon name="RotateCcw" className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <Shad.DialogTitle className="text-base">
            Create Refund
          </Shad.DialogTitle>
          <p className="text-xs text-muted-foreground">
            Order #{refundableInfo.orderNumber || orderId.slice(0, 8)}
          </p>
        </div>
      </div>

      {/* ── Order Context ── */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/40">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Order Total</p>
          <p className="text-sm font-semibold tabular-nums">
            ${formatPrice(refundableInfo.orderTotal)}
          </p>
        </div>
        <div className="text-right space-y-0.5">
          <p className="text-xs text-muted-foreground">Items</p>
          <p className="text-sm font-semibold tabular-nums">
            {refundableInfo.items.length}
          </p>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleSelectAll}>
          <Icon name="SquareCheck" className="w-3.5 h-3.5" />
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearSelection}
          disabled={selectedItems.size === 0}
        >
          <Icon name="X" className="w-3.5 h-3.5" />
          Clear
        </Button>
        {selectedItems.size > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {selectedItems.size} selected
          </span>
        )}
      </div>

      {/* ── Items List ── */}
      <div className="space-y-5">
        {/* Refundable Items */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Select items to refund
          </p>
          <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/30">
            {refundableItems.map((item) => {
              const selection = selectedItems.get(item.orderItemId);
              const isSelected = !!selection;
              const selectedQty = selection?.quantity || 0;

              return (
                <div
                  key={item.orderItemId}
                  className={cn(
                    "px-4 py-4 transition-colors",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Product Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {item.productName}
                        </p>
                        {item.refundedQuantity > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30"
                          >
                            {item.refundedQuantity} refunded
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          ${formatPrice(item.unitPrice)} × {item.quantity}
                        </span>
                        <span className="text-primary/80">
                          {item.refundableQuantity} refundable
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="inline-flex items-center rounded-lg border border-border/60 bg-background">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-l-lg"
                          onClick={() =>
                            handleQuantityChange(
                              item.orderItemId,
                              selectedQty - 1,
                            )
                          }
                          disabled={selectedQty <= 0}
                        >
                          <Icon name="Minus" className="w-3 h-3" />
                        </Button>
                        <span className="w-9 text-center font-semibold text-sm tabular-nums border-x border-border/40">
                          {selectedQty}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-r-lg"
                          onClick={() =>
                            handleQuantityChange(
                              item.orderItemId,
                              selectedQty + 1,
                            )
                          }
                          disabled={selectedQty >= item.refundableQuantity}
                        >
                          <Icon name="Plus" className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Item Subtotal */}
                      <span className="text-sm font-semibold text-destructive tabular-nums w-20 text-right">
                        -${formatPrice(selectedQty * item.unitPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fully Refunded Items */}
        {fullyRefundedItems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
              Fully refunded
            </p>
            <div className="rounded-xl border border-border/30 overflow-hidden divide-y divide-border/20">
              {fullyRefundedItems.map((item) => (
                <div
                  key={item.orderItemId}
                  className="px-4 py-3 flex items-center justify-between opacity-50"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      ${formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 bg-muted/50 text-muted-foreground border-border/40"
                  >
                    Fully Refunded
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Refund Reason ── */}
      <div className="space-y-2.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
          Reason
        </p>
        <div className="flex flex-wrap gap-2">
          {REFUND_REASONS.map((r) => (
            <Button
              key={r.value}
              variant={reason === r.value ? "default" : "outline"}
              size="sm"
              onClick={() => setReason(r.value)}
            >
              <Icon name={r.icon} className="w-3.5 h-3.5" />
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Notes ── */}
      {reason === "OTHER" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Additional Notes
          </p>
          <Textarea
            placeholder="Describe the reason…"
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNotes(e.target.value)
            }
            rows={2}
            className="resize-none"
          />
        </div>
      )}

      {/* ── Refund Total ── */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">Refund Total</p>
            {hasSelection && (
              <p className="text-xs text-muted-foreground">
                {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <span
            className={cn(
              "text-xl font-bold tabular-nums",
              refundTotal > 0 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            ${formatPrice(refundTotal)}
          </span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1 h-10" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          className="flex-1 h-10"
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
