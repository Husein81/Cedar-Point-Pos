import { useEffect, useRef } from "react";
import { useCartStockWarnings } from "@/hooks/useCartStockWarning";
import { useProducts } from "@/hooks/useProduct";
import { useUpdateTableStatus } from "@/hooks/useTable";
import { useKeypadStore } from "@/store/keypadStore";
import { useModalStore } from "@/store/modalStore";
import { OrderItem, useOrderStore } from "@/store/orderStore";
import { SelectedModifier } from "@/types/modifiers";
import { Product } from "@repo/types";
import { Button, cn, Empty, Icon, Shad } from "@repo/ui";
import { InlineKeypad } from "./InlineKeypad";
import { CartItem } from "./CartItem";
import { CustomerSelector } from "./CustomerSelector";
import { ModifierModal } from "./ModifierModal";
import { TableSelector } from "./TableSelector";
import OrderSummary from "./OrderSummary";
import { OrderTypeSelector } from "./OrderTypeSelector";
import { useAuthStore } from "@/store/authStore";

export const OrderCart = () => {
  const {
    getActiveOrder,
    updateItemQuantity,
    updateItemPrice,
    removeItem,
    clearOrder,
    updateItemDiscount,
    updateItemModifiers,
  } = useOrderStore();

  const { user } = useAuthStore();
  const { openModal } = useModalStore();
  const { closeKeypad, itemId: selectedKeypadItemId } = useKeypadStore();

  const isRestaurant = user?.tenant?.businessType === "RESTAURANT" || false;

  const { hasAnyWarning } = useCartStockWarnings();
  const { data: products } = useProducts();
  const { mutate: updateTableStatus } = useUpdateTableStatus();

  const order = getActiveOrder();
  const items = order?.items || [];

  // Track previous items count to detect when first item is added
  const prevItemsCount = useRef(0);

  // Auto-set table to OCCUPIED when first item is added
  useEffect(() => {
    const currentCount = items.length;
    const tableId = order?.tableId;

    // Only trigger when going from 0 items to 1+ items with a table assigned
    if (prevItemsCount.current === 0 && currentCount > 0 && tableId) {
      updateTableStatus({ id: tableId, status: "OCCUPIED" });
    }

    prevItemsCount.current = currentCount;
  }, [items.length, order?.tableId, updateTableStatus]);


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
    type: "PERCENTAGE" | "FIXED",
  ) => {
    updateItemDiscount(id, { value, type });
  };

  const handleRemoveItem = (id: string) => {
    removeItem(id);
    closeKeypad();
  };

  const handleEditModifiers = (item: OrderItem) => {
    // Find the product for this cart item
    const product = products?.find((p: Product) => p.id === item.productId);
    if (!product) return;

    // Convert existing modifiers to SelectedModifier format
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
          // Update the item modifiers
          updateItemModifiers(
            item.id,
            modifiers.map((m) => ({
              modifierId: m.modifierId,
              name: m.name,
              price: m.price,
            })),
          );
          // Update quantity if changed
          if (quantity !== item.quantity) {
            updateItemQuantity(item.id, quantity);
          }
        }}
      />,
      "Update your selections",
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-background")}>
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
          <div className="flex items-center gap-2">
            <TableSelector />
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
        </div>
        <CustomerSelector />
      </div>

      {/* Order Type Selector */}
      {isRestaurant && <OrderTypeSelector />}

      {/* Stock Warning Banner */}
      {hasAnyWarning && items.length >= 0 && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <Icon
            name="TriangleAlert"
            className="h-4 w-4 text-amber-500 shrink-0"
          />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Some items will exceed available stock
          </p>
        </div>
      )
      }

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

      {/* Taxes & Total Section */}
      <OrderSummary />

      {/* Inline Keypad - Collapsible */}
      <InlineKeypad />
    </div >
  );
};
