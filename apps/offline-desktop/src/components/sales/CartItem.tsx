import { memo } from "react";
import { useKeypadStore } from "@/store/keypadStore";
import { cn, Icon } from "@repo/ui";
import { DiscountType } from "@/shared/enums";
import { formatMoney } from "@/utils/format";
import type { DraftItem } from "@/store/orderStore";

type Props = {
  item: DraftItem;
  isSelected?: boolean;
  currencySymbol: string;
  onSelect?: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onPriceChange?: (id: string, price: number) => void;
  onDiscountChange?: (id: string, value: number, type: DiscountType) => void;
  onRemove: (id: string) => void;
};

const StepperButton = ({
  icon,
  label,
  destructive,
  onClick,
}: {
  icon: string;
  label: string;
  destructive?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={cn(
      "flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background",
      "transition-all duration-75 active:scale-90",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      destructive
        ? "text-destructive hover:border-destructive/40 hover:bg-destructive/10"
        : "text-foreground hover:border-primary/40 hover:bg-primary/5",
    )}
  >
    <Icon name={icon} className="h-3.5 w-3.5" />
  </button>
);

export const CartItem = memo(function CartItem({
  item,
  isSelected = false,
  currencySymbol,
  onSelect,
  onQuantityChange,
  onPriceChange,
  onDiscountChange,
  onRemove,
}: Props) {
  const openKeypad = useKeypadStore((s) => s.openKeypad);

  const lineTotal = item.price * item.quantity;

  const discountAmount = item.discount
    ? item.discount.type === DiscountType.PERCENT
      ? lineTotal * (item.discount.value / 100)
      : item.discount.value
    : 0;
  const finalTotal = lineTotal - discountAmount;

  const handleSelect = () => {
    onSelect?.(item.id);

    openKeypad({
      context: "QUANTITY",
      currentValue: item.quantity,
      itemId: item.id,
      itemQuantity: item.quantity,
      itemPrice: item.price,
      itemDiscountValue: item.discount?.value ?? 0,
      discountType: item.discount?.type || DiscountType.PERCENT,
      onConfirm: (value) => {
        if (value > 0) {
          onQuantityChange(item.id, value);
        } else {
          onRemove(item.id);
        }
      },
      onPriceChange: onPriceChange
        ? (value) => onPriceChange(item.id, value)
        : undefined,
      onDiscountChange: onDiscountChange
        ? (value, type) => onDiscountChange(item.id, value, type)
        : undefined,
    });
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.quantity <= 1) {
      onRemove(item.id);
    } else {
      onQuantityChange(item.id, item.quantity - 1);
    }
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(item.id, item.quantity + 1);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${item.name}, quantity ${item.quantity}`}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      }}
      className={cn(
        "group relative cursor-pointer border-b border-border/40 px-3 py-2.5 outline-none",
        "animate-in fade-in slide-in-from-right-2 duration-200",
        "transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        isSelected
          ? "border-l-2 border-l-primary bg-primary/5"
          : "border-l-2 border-l-transparent hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Thumbnail */}
        {item.imagePath ? (
          <img
            src={item.imagePath}
            alt=""
            draggable={false}
            className="mt-0.5 h-10 w-10 shrink-0 rounded-md border border-border/50 object-cover"
          />
        ) : (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon name="Package" className="h-4 w-4 text-muted-foreground/60" />
          </div>
        )}

        {/* Details */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {item.name}
          </p>

          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {formatMoney(item.price, currencySymbol)} × {item.quantity}
          </p>

          {/* Status chips */}
          {(item.notes || discountAmount > 0) && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {item.notes && (
                <span className="inline-flex max-w-40 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  <Icon name="StickyNote" className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{item.notes}</span>
                </span>
              )}
              {discountAmount > 0 && item.discount && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  <Icon name="TicketPercent" className="h-2.5 w-2.5" />
                  {item.discount.type === DiscountType.PERCENT
                    ? `${item.discount.value}%`
                    : formatMoney(item.discount.value, currencySymbol)}{" "}
                  off
                </span>
              )}
            </div>
          )}
        </div>

        {/* Total + stepper */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="text-right leading-tight">
            <span className="text-sm font-semibold tabular-nums">
              {formatMoney(finalTotal, currencySymbol)}
            </span>
            {discountAmount > 0 && (
              <p className="text-[10px] tabular-nums text-muted-foreground line-through">
                {formatMoney(lineTotal, currencySymbol)}
              </p>
            )}
          </div>

          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <StepperButton
              icon={item.quantity <= 1 ? "Trash2" : "Minus"}
              label={item.quantity <= 1 ? "Remove item" : "Decrease quantity"}
              destructive={item.quantity <= 1}
              onClick={handleDecrease}
            />
            <button
              type="button"
              aria-label="Edit quantity"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect();
              }}
              className={cn(
                "h-8 min-w-8 rounded-md px-1 text-sm font-semibold tabular-nums",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted",
              )}
            >
              {item.quantity}
            </button>
            <StepperButton
              icon="Plus"
              label="Increase quantity"
              onClick={handleIncrease}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
