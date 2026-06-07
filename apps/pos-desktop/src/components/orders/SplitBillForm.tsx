import type { Order } from "@/dto/order.dto";
import { useModalStore } from "@/store/modalStore";
import { Button, Icon, Shad } from "@repo/ui";
import { useMemo, useState } from "react";
import { formatPrice } from "./config";

type Props = {
  order: Order;
  onConfirm: (items: { itemId: string; quantity: number }[]) => void;
};

export const SplitBillForm = ({ order, onConfirm }: Props) => {
  const { closeModal } = useModalStore();
  const [itemSplits, setItemSplits] = useState<Record<string, number>>({});

  const isValid = useMemo(() => {
    return Object.values(itemSplits).some((qty) => qty > 0);
  }, [itemSplits]);

  const handleItemQuantityChange = (
    itemId: string,
    quantity: number,
    maxQuantity: number,
  ) => {
    const validQty = Math.max(0, Math.min(quantity, maxQuantity));
    setItemSplits((prev) => ({
      ...prev,
      [itemId]: validQty,
    }));
  };

  const selectedItemsTotal = useMemo(() => {
    return Object.entries(itemSplits).reduce((sum, [itemId, qty]) => {
      const item = order.items.find((i) => i.id === itemId);
      if (item && qty > 0) {
        return sum + item.price * qty;
      }
      return sum;
    }, 0);
  }, [itemSplits, order.items]);

  const handleConfirm = () => {
    if (!isValid) return;
    const selected = Object.entries(itemSplits)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));
    onConfirm(selected);
    closeModal();
  };

  return (
    <div className="px-2">
      <Shad.DialogHeader>
        <Shad.DialogDescription>
          Select items to split into a new order
        </Shad.DialogDescription>
      </Shad.DialogHeader>

      <div className="space-y-6 pt-2">
        <div className="space-y-4">
          <Shad.ScrollArea className="max-h-[400px] pr-2">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border space-y-0"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ${formatPrice(item.price)} x {item.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        handleItemQuantityChange(
                          item.id,
                          (itemSplits[item.id] || 0) - 1,
                          item.quantity,
                        )
                      }
                      disabled={!itemSplits[item.id]}
                    >
                      <Icon name="Minus" className="w-3.5 h-3.5" />
                    </Button>
                    <span className="w-8 text-center font-bold">
                      {itemSplits[item.id] || 0}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        handleItemQuantityChange(
                          item.id,
                          (itemSplits[item.id] || 0) + 1,
                          item.quantity,
                        )
                      }
                      disabled={(itemSplits[item.id] || 0) >= item.quantity}
                    >
                      <Icon name="Plus" className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Shad.ScrollArea>

          <div className="flex items-center justify-between p-3 rounded-lg border-2 bg-primary/5 border-primary/20">
            <span className="text-sm font-medium">Selected Items Total</span>
            <span className="font-bold text-sm text-primary">
              ${formatPrice(selectedItemsTotal)}
            </span>
          </div>
        </div>
      </div>

      <Shad.DialogFooter className="gap-2 pt-4">
        <Button variant="outline" onClick={closeModal} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!isValid} className="flex-1">
          <Icon name="Check" className="w-4 h-4" />
          Confirm Split
        </Button>
      </Shad.DialogFooter>
    </div>
  );
};
