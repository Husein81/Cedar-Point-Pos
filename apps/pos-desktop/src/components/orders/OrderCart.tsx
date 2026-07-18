import { useCallback, useEffect, useRef } from "react";
import { useCartStockWarnings } from "@/hooks/useCartStockWarning";
import { useDeliveryCustomerEnforcement } from "@/hooks/useDeliveryCustomerEnforcement";
import { useProducts } from "@/hooks/useProduct";
import { useUpdateTableStatus } from "@/hooks/useTable";
import { useKeypadStore } from "@/store/keypadStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { SelectedModifier } from "@/types/modifiers";
import { OrderItem } from "@/dto/order.dto";
import { Product } from "@repo/types";
import { Icon, Shad } from "@repo/ui";
import { CartItem } from "./CartItem";
import CheckoutActions from "./CheckoutActions";
import { InlineKeypad } from "./Keypad/InlineKeypad";
import { ModifierModal } from "./ModifierModal";
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

export const OrderCart = () => {
  const {
    getActiveOrder,
    updateItemQuantity,
    updateItemPrice,
    removeItem,
    updateItemDiscount,
    updateItemModifiers,
  } = useOrderStore();

  const { openModal } = useModalStore();
  const { closeKeypad, itemId: selectedKeypadItemId } = useKeypadStore();

  useDeliveryCustomerEnforcement();

  const { hasAnyWarning } = useCartStockWarnings();
  const { data: products } = useProducts();
  const { mutate: updateTableStatus } = useUpdateTableStatus();

  const order = getActiveOrder();
  const items = order?.items || [];

  // Auto-set table to OCCUPIED when the first item is added
  const prevItemsCount = useRef(0);
  useEffect(() => {
    const currentCount = items.length;
    const tableId = order?.tableId;

    if (prevItemsCount.current === 0 && currentCount > 0 && tableId) {
      updateTableStatus({ id: tableId, status: "OCCUPIED" });
    }

    prevItemsCount.current = currentCount;
  }, [items.length, order?.tableId, updateTableStatus]);

  const handleQuantityChange = useCallback(
    (id: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(id);
        closeKeypad();
        return;
      }

      updateItemQuantity(id, quantity);

      // Keep the open keypad in sync when quantity changes via the stepper
      const keypad = useKeypadStore.getState();
      if (
        keypad.isOpen &&
        keypad.itemId === id &&
        keypad.context === "QUANTITY"
      ) {
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
    (id: string, value: number, type: "PERCENTAGE" | "FIXED") => {
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

  const handleEditModifiers = useCallback(
    (item: OrderItem) => {
      const product = products?.find((p: Product) => p.id === item.productId);
      if (!product) return;

      const initialModifiers: SelectedModifier[] =
        item.modifiers?.map((m) => ({
          modifierId: m.modifierId,
          name: m.name,
          price: m.price,
          groupId: "", // Will be populated by the hook
        })) || [];

      openModal(
        `Edit - ${item.name}`,
        <ModifierModal
          product={product}
          initialModifiers={initialModifiers}
          initialQuantity={item.quantity}
          onConfirm={(modifiers, quantity) => {
            updateItemModifiers(
              item.id,
              modifiers.map((m) => ({
                modifierId: m.modifierId,
                name: m.name,
                price: m.price,
              })),
            );
            if (quantity !== item.quantity) {
              updateItemQuantity(item.id, quantity);
            }
          }}
        />,
        "Update your selections",
      );
    },
    [openModal, products, updateItemModifiers, updateItemQuantity],
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <OrderHeader />

      {/* Stock Warning Banner */}
      {hasAnyWarning && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
          <Icon
            name="TriangleAlert"
            className="h-4 w-4 shrink-0 text-amber-500"
          />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Some items will exceed available stock
          </p>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <Shad.ScrollArea className="min-h-0 flex-1">
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
                onEditModifiers={
                  item.modifiers && item.modifiers.length > 0
                    ? handleEditModifiers
                    : undefined
                }
              />
            ))}
          </div>
          <Shad.ScrollBar />
        </Shad.ScrollArea>
      )}

      {/* Inline editor for the selected line / adjustment */}
      <InlineKeypad />

      {/* Totals */}
      <OrderSummary />

      {/* Persistent checkout bar */}
      <CheckoutActions />
    </div>
  );
};
