import { useOrderStore } from "@/store/orderStore";
import { Button, cn, Empty, Icon, Separator, Shad } from "@repo/ui";
import { CartItem } from "./CartItem";
import { CustomerSelector } from "./CustomerSelector";

type Props = {
  className?: string;
};

export const OrderCart = ({ className }: Props) => {
  const { getActiveOrder, updateItemQuantity, removeItem, clearOrder } =
    useOrderStore();

  const order = getActiveOrder();
  const items = order?.items || [];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Cart Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Icon name="ShoppingCart" className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Order Items</h2>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={clearOrder}
          disabled={items.length === 0}
          className="text-white h-7 text-xs"
        >
          <Icon name="Trash2" className="w-3.5 h-3.5" />
          Clear
        </Button>
      </div>

      {/* Customer Selector - Optional */}
      <CustomerSelector className="pb-2" />

      <Separator className="mb-2" />

      {/* Items List */}
      {items.length === 0 ? (
        <Empty title="No items in order" icon="ShoppingCart" />
      ) : (
        <Shad.ScrollArea className="flex-1 min-h-0 ">
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onQuantityChange={updateItemQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>

          <Shad.ScrollBar />
        </Shad.ScrollArea>
      )}
    </div>
  );
};
