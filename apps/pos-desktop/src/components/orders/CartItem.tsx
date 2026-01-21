import { useCartItemStockWarning } from "@/hooks/useCartStockWarning";
import { useKeypadStore } from "@/store/keypadStore";
import { Button, cn, Icon, Shad } from "@repo/ui";
import { formatPrice } from "./config";
import { DiscountType, OrderItemModifier } from "@/store/orderStore";

type Item = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount?: {
    value: number;
    type: DiscountType;
  };
  imageUrl?: string | null;
  modifiers?: OrderItemModifier[];
};

type Props = {
  item: Item;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onPriceChange?: (id: string, price: number) => void;
  onDiscountChange?: (id: string, value: number, type: DiscountType) => void;
  onRemove: (id: string) => void;
  onEditModifiers?: (item: Item) => void; // Edit modifiers callback
};

export const CartItem = ({
  item,
  isSelected = false,
  onSelect,
  onQuantityChange,
  onPriceChange,
  onDiscountChange,
  onRemove,
  onEditModifiers,
}: Props) => {
  const { openKeypad, isOpen, itemId } = useKeypadStore();
  const { warning } = useCartItemStockWarning(item.productId);

  // Calculate line total with modifiers
  const modifiersTotal =
    item.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0;
  const unitPrice = item.price + modifiersTotal;
  const lineTotal = unitPrice * item.quantity;

  const discountAmount = item.discount
    ? item.discount.type === "PERCENTAGE"
      ? lineTotal * (item.discount.value / 100)
      : item.discount.value
    : 0;
  const finalTotal = lineTotal - discountAmount;

  // Stock warning state
  const showStockWarning = warning?.isNegative ?? false;
  const resultingStock = warning?.resultingStock ?? 0;

  const handleSelect = () => {
    onSelect?.(item.id);

    // Open keypad with item context - can switch between Qty/Price/Discount
    openKeypad({
      context: "QUANTITY",
      currentValue: item.quantity,
      itemId: item.id,
      itemQuantity: item.quantity,
      itemPrice: item.price,
      itemDiscountValue: item.discount?.value ?? 0,
      discountType: item.discount?.type || "PERCENTAGE",

      // Quantity confirm
      onConfirm: (value) => {
        if (value > 0) {
          onQuantityChange(item.id, value);
        } else {
          onRemove(item.id);
        }
      },

      // Price override
      onPriceChange: onPriceChange
        ? (value) => onPriceChange(item.id, value)
        : undefined,

      // Item-level discount
      onDiscountChange: onDiscountChange
        ? (value, type) => onDiscountChange(item.id, value, type)
        : undefined,
    });
  };

  const isActive = isSelected || (isOpen && itemId === item.id);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-3 py-2 cursor-pointer transition-colors",
        "border-b border-border/40",
        isActive
          ? "bg-primary/5 border-l-2 border-l-primary"
          : "hover:bg-muted/30",
        showStockWarning && "bg-amber-50/50 dark:bg-amber-950/20",
      )}
      onClick={handleSelect}
    >
      {/* Quantity with Stock Warning */}
      <div className="flex items-center gap-1">
        <span className="w-6 text-sm font-semibold text-foreground tabular-nums">
          {item.quantity}
        </span>
        {showStockWarning && (
          <Shad.Tooltip>
            <Shad.TooltipTrigger asChild>
              <span
                className="cursor-help"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon
                  name="TriangleAlert"
                  className="h-3.5 w-3.5 text-amber-500"
                />
              </span>
            </Shad.TooltipTrigger>
            <Shad.TooltipContent side="top" className="max-w-50">
              <p className="text-xs">
                <span className="font-semibold text-amber-600">
                  Low stock warning
                </span>
                <br />
                Stock after sale: {resultingStock.toFixed(2)}
              </p>
            </Shad.TooltipContent>
          </Shad.Tooltip>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        {/* Item Name */}
        <p className="text-sm font-medium text-foreground line-clamp-1">
          {item.name}
        </p>

        {/* Modifiers */}
        {item.modifiers && item.modifiers.length > 0 && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.modifiers.map((mod, idx) => (
              <span key={mod.modifierId}>
                {mod.name}
                {mod.price > 0 && ` (+$${mod.price.toFixed(2)})`}
                {idx < item.modifiers!.length - 1 && ", "}
              </span>
            ))}
            {onEditModifiers && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditModifiers(item);
                }}
                className="ml-1 text-primary hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        )}

        {/* Unit Price */}
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatPrice(unitPrice)} $/Units
        </p>

        {/* Discount Info (if any) */}
        {item.discount && item.discount.value > 0 && (
          <p className="text-xs text-primary">
            {item.discount.value}
            {item.discount.type === "PERCENTAGE" ? "%" : " $"} discount -
            {formatPrice(discountAmount)} $ off
          </p>
        )}

        {/* Stock Warning Inline (alternative to tooltip for visibility) */}
        {showStockWarning && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
            <Icon name="CircleAlert" className="h-3 w-3" />
            Stock after sale: {resultingStock.toFixed(2)}
          </p>
        )}
      </div>

      {/* Line Total */}
      <div className="text-right shrink-0">
        <span className={cn("text-sm font-semibold tabular-nums")}>
          {finalTotal} ${" "}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          (e as React.MouseEvent<HTMLButtonElement>).stopPropagation();
          onRemove(item.id);
        }}
      >
        <Icon name="X" className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
