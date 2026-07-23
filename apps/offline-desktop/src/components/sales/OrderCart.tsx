import { useCallback } from "react";
import { useKeypadStore } from "@/store/keypadStore";
import { useOrderStore } from "@/store/orderStore";
import { DiscountType } from "@/shared/enums";
import { Icon, Shad } from "@repo/ui";
import { CartItem } from "./CartItem";
import CheckoutActions from "./CheckoutActions";
import { InlineKeypad } from "./Keypad/InlineKeypad";
import { OrderHeader } from "./OrderHeader";
import OrderSummary from "./OrderSummary";

const EmptyCart = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
      <Icon name="ShoppingCart" className="h-7 w-7 text-muted-foreground/50" />
    </div>
    <div>
      <p className="text-sm font-medium">No items added yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Select a product to begin the order.
      </p>
    </div>
  </div>
);

type Props = {
  currencySymbol: string;
  taxRate: number;
};

export const OrderCart = ({ currencySymbol, taxRate }: Props) => {
  const {
    getActiveOrder,
    updateItemQuantity,
    updateItemPrice,
    removeItem,
    updateItemDiscount,
  } = useOrderStore();

  const { closeKeypad, itemId: selectedKeypadItemId } = useKeypadStore();

  const order = getActiveOrder();
  const items = order?.items || [];

  const handleQuantityChange = useCallback(
    (id: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(id);
        closeKeypad();
        return;
      }

      updateItemQuantity(id, quantity);

      const keypad = useKeypadStore.getState();
      if (keypad.isOpen && keypad.itemId === id && keypad.context === "QUANTITY") {
        keypad.updateValue(quantity);
      }
    },
    [closeKeypad, removeItem, updateItemQuantity],
  );

  const handlePriceChange = useCallback(
    (id: string, price: number) => {
      updateItemPrice(id, price);
    },
    [updateItemPrice],
  );

  const handleDiscountChange = useCallback(
    (id: string, value: number, type: DiscountType) => {
      updateItemDiscount(id, { value, type });
    },
    [updateItemDiscount],
  );

  const handleRemoveItem = useCallback(
    (id: string) => {
      removeItem(id);
      closeKeypad();
    },
    [closeKeypad, removeItem],
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <OrderHeader />

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <Shad.ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                currencySymbol={currencySymbol}
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

      <InlineKeypad />

      <OrderSummary currencySymbol={currencySymbol} taxRate={taxRate} />

      <CheckoutActions currencySymbol={currencySymbol} taxRate={taxRate} />
    </div>
  );
};
