import { useEffect, useState } from "react";
import { Button, Input, Shad } from "@repo/ui";
import { useRefundOrder } from "@/hooks/useOrder";
import type { OrderItem, OrderWithDetails } from "@/shared/models";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithDetails;
  currencySymbol: string;
};

type RefundableItem = OrderItem & { refundedQuantity?: number };

export const RefundDialog = ({ open, onOpenChange, order }: Props) => {
  const refundOrder = useRefundOrder();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setQuantities({});
      setReason("");
    }
  }, [open]);

  const refundableOf = (item: RefundableItem) =>
    item.quantity - (item.refundedQuantity ?? 0);

  const selectedItems = order.items
    .map((item) => ({ item, quantity: quantities[item.id] ?? 0 }))
    .filter((entry) => entry.quantity > 0);

  const handleRefund = async () => {
    await refundOrder.mutateAsync({
      orderId: order.id,
      items: selectedItems.map((entry) => ({
        orderItemId: entry.item.id,
        quantity: entry.quantity,
      })),
      reason: reason || null,
    });
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="max-w-md">
        <Shad.DialogHeader>
          <Shad.DialogTitle>Refund {order.orderNumber}</Shad.DialogTitle>
          <Shad.DialogDescription>
            Choose quantities to refund. Stock is restored automatically.
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <div className="rounded-md border divide-y">
          {order.items.map((item) => {
            const refundable = refundableOf(item as RefundableItem);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {refundable} of {item.quantity} refundable
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={refundable}
                  className="w-20 h-8 text-right"
                  value={quantities[item.id] ?? ""}
                  disabled={refundable <= 0}
                  onChange={(e) => {
                    const value = Math.min(
                      Math.max(Number(e.target.value) || 0, 0),
                      refundable,
                    );
                    setQuantities((previous) => ({
                      ...previous,
                      [item.id]: value,
                    }));
                  }}
                />
              </div>
            );
          })}
        </div>

        <Input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <Shad.DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={selectedItems.length === 0 || refundOrder.isPending}
            isSubmitting={refundOrder.isPending}
            onClick={handleRefund}
          >
            Refund Selected
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
