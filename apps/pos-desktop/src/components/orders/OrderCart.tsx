import { useKeypadStore } from "@/store/keypadStore";
import { useOrderStore } from "@/store/orderStore";
import { Button, cn, Empty, Icon, Shad } from "@repo/ui";
import { InlineKeypad } from "../common";
import { CartItem } from "./CartItem";
import { CustomerSelector } from "./CustomerSelector";
import OrderSummary from "./OrderSummary";

type Props = {
  className?: string;
};

export const OrderCart = ({ className }: Props) => {
  const {
    getActiveOrder,
    updateItemQuantity,
    updateItemPrice,
    removeItem,
    clearOrder,
    updateItemDiscount,
  } = useOrderStore();

  const { closeKeypad, itemId: selectedKeypadItemId } = useKeypadStore();

  const order = getActiveOrder();
  const items = order?.items || [];

  // Calculate raw subtotal (before any discounts)
  const handleQuantityChange = (id: string, quantity: number) => {
    updateItemQuantity(id, quantity);
  };

  const handlePriceChange = (id: string, price: number) => {
    updateItemPrice(id, price);
  };

  const handleDiscountChange = (
    id: string,
    value: number,
    type: "PERCENTAGE" | "FIXED"
  ) => {
    updateItemDiscount(id, { value, type });
  };

  const handleRemoveItem = (id: string) => {
    removeItem(id);
    closeKeypad();
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Cart Header */}
      <div className="flex flex-col gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between ">
          <div className="flex items-center gap-2">
            <Icon
              name="ShoppingCart"
              className="w-4 h-4 text-muted-foreground"
            />
            <h2 className="text-sm font-semibold">Order</h2>
            {items.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearOrder();
                closeKeypad();
              }}
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Icon name="Trash2" className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <CustomerSelector />
      </div>

      {/* Items List - Scrollable */}
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Empty title="No items in order" icon="ShoppingCart" />
        </div>
      ) : (
        <Shad.ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                isSelected={selectedKeypadItemId === item.id}
                onQuantityChange={handleQuantityChange}
                onPriceChange={handlePriceChange}
                onDiscountChange={handleDiscountChange}
                onRemove={handleRemoveItem}
              />
            ))}
          </div>
          <Shad.ScrollBar />
        </Shad.ScrollArea>
      )}

      {/* Taxes & Total Section */}
      <OrderSummary />

      {/* Inline Keypad - Collapsible */}
      <InlineKeypad />
    </div>
  );
};
