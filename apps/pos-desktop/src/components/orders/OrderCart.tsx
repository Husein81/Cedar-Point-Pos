import { Button, Empty, Icon, Shad } from "@repo/ui";
import { useOrderStore } from "@/store/orderStore";
import { cn } from "@repo/ui";

type Props = {
  className?: string;
};

const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return "0";
  return new Intl.NumberFormat("en-LB", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

interface CartItemRowProps {
  item: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  };
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

const CartItemRow = ({
  item,
  onQuantityChange,
  onRemove,
}: CartItemRowProps) => {
  return (
    // Card-style item with clear 2-row structure for easy scanning
    <div className="flex flex-col gap-2 py-3 px-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
      {/* Row 1: Product Name + Delete */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-snug line-clamp-2 flex-1 cursor-default">
          {item.name}
        </p>
        {/* Delete - visually separated in top-right */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(item.id)}
        >
          <Icon name="Trash2" className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Row 2: Unit Info | Quantity Controls | Subtotal */}
      <div className="flex items-center justify-between gap-3">
        {/* Unit price info - muted, secondary */}
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {item.quantity} × ${formatPrice(item.price)}
        </p>

        {/* Quantity Controls - compact, grouped */}
        <div className="flex items-center gap-0.5 bg-background rounded-lg border shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-l-lg rounded-r-none"
            onClick={() => onQuantityChange(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Icon name="Minus" className="w-3 h-3" />
          </Button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums bg-muted/30">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-r-lg rounded-l-none"
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
          >
            <Icon name="Plus" className="w-3 h-3" />
          </Button>
        </div>

        {/* Subtotal - prominent, right-aligned */}
        <span className="font-bold text-sm text-primary tabular-nums min-w-16 text-right">
          ${formatPrice(item.price * item.quantity)}
        </span>
      </div>
    </div>
  );
};

export const OrderCart = ({ className }: Props) => {
  const { getActiveOrder, updateItemQuantity, removeItem, clearOrder } =
    useOrderStore();

  const order = getActiveOrder();
  const items = order?.items || [];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Cart Header */}
      <div className="flex items-center justify-between pb-3">
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
          variant="ghost"
          size="sm"
          onClick={clearOrder}
          disabled={items.length === 0}
          className="text-destructive hover:text-destructive h-7 text-xs"
        >
          <Icon name="Trash2" className="w-3.5 h-3.5" />
          Clear
        </Button>
      </div>

      {/* Items List */}
      <Shad.ScrollArea className="flex-1 min-h-0 -mx-1">
        <div className="px-1">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-50">
              <Empty title="No items in order" icon="ShoppingCart" />
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onQuantityChange={updateItemQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}
        </div>
        <Shad.ScrollBar />
      </Shad.ScrollArea>
    </div>
  );
};
