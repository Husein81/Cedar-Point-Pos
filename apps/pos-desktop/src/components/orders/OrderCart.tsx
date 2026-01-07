import { Button, Empty, Input, Select } from "@repo/ui";
import { Plus, Minus, Trash2 } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";
import { cn } from "@repo/ui";
import { useMemo } from "react";

type Props = {
  className?: string;
};

export const OrderCart = ({ className }: Props) => {
  const {
    getActiveOrder,
    updateItemQuantity,
    removeItem,
    clearOrder,
    setDiscount,
    getOrderSubtotal,
    getDiscountAmount,
    getOrderTotal,
  } = useOrderStore();

  const order = getActiveOrder();

  // Format currency for Lebanese retail (LBP)
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return "N/A";
    return new Intl.NumberFormat("en-LB", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Discount input state (could be improved with local state)
  // For now, just show discount if present
  const discountValue = order?.discount?.value || 0;
  const discountType = order?.discount?.type || "PERCENTAGE";

  // Cart items
  const items = order?.items || [];

  // Subtotal, discount, total
  const subtotal = useMemo(() => getOrderSubtotal(), [getOrderSubtotal, order]);
  const discount = useMemo(
    () => getDiscountAmount(),
    [getDiscountAmount, order]
  );
  const total = useMemo(() => getOrderTotal(), [getOrderTotal, order]);

  return (
    <div className={cn("flex flex-col h-full gap-4", className)}>
      {/* Cart Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Order Cart</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearOrder}
          disabled={items.length === 0}
          className="text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <Empty title="No items in order" icon={"ShoppingCart"} />
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(item.price)} $
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateItemQuantity(item.id, item.quantity - 1)
                    }
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold text-base">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateItemQuantity(item.id, item.quantity + 1)
                    }
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="w-20 text-right font-semibold text-base">
                  {formatPrice(item.price * item.quantity)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Discount Input */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Discount:</span>
        <Input
          type="number"
          min={0}
          max={discountType === "PERCENTAGE" ? 100 : subtotal}
          value={discountValue}
          className="flex-1 h-9 text-base"
          onChange={(e) =>
            setDiscount({
              type: discountType,
              value: Math.max(0, Number(e.target.value)),
            })
          }
        />
        <Select
          value={discountType}
          onChange={(opt) =>
            setDiscount({
              type: opt.value as "PERCENTAGE" | "FIXED",
              value: discountValue,
            })
          }
          options={[
            { label: "%", value: "PERCENTAGE" },
            { label: "$", value: "FIXED" },
          ]}
        />
      </div>

      {/* Subtotal, Discount, Total */}
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex justify-between text-xs">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)} $P</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Discount</span>
          <span>-{formatPrice(discount)} $</span>
        </div>
        <div className="flex justify-between text-sm font-bold mt-2">
          <span>Total</span>
          <span>{formatPrice(total)} $</span>
        </div>
      </div>
    </div>
  );
};
