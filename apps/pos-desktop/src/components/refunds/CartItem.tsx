import type { RefundCartItem } from "@/store/refundStore";
import { Badge, Button, Checkbox, cn, Icon, Input } from "@repo/ui";

interface Props {
  item: RefundCartItem;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
}

export const CartItem = ({ item, onToggle, onQuantityChange }: Props) => {
  const isDisabled = item.refundableQuantity <= 0;

  // Fully refunded items — muted row with badge
  if (isDisabled) {
    return (
      <div className="flex items-center gap-4 px-5 py-4 opacity-50">
        {/* Image */}
        <div className="h-10 w-10 rounded-lg bg-muted/60 overflow-hidden shrink-0">
          {item.productImageUrl ? (
            <img
              src={item.productImageUrl}
              alt={item.productName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center">
              <Icon name="Package" className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{item.productName}</p>
          <p className="text-xs text-muted-foreground">
            ${item.unitPrice.toFixed(2)} × {item.originalQuantity}
          </p>
        </div>

        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0.5 bg-muted/50 text-muted-foreground border-border/40 shrink-0"
        >
          Fully Refunded
        </Badge>
      </div>
    );
  }

  return (
    <div
      onClick={onToggle}
      className={cn(
        "flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer",
        item.isSelected ? "bg-primary/5" : "hover:bg-muted/30",
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={item.isSelected}
        className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        onChange={onToggle}
      />

      {/* Image */}
      <div className="h-10 w-10 rounded-lg bg-muted/40 overflow-hidden shrink-0 border border-border/30">
        {item.productImageUrl ? (
          <img
            src={item.productImageUrl}
            alt={item.productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full grid place-items-center">
            <Icon name="Package" className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Top row: name + price */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{item.productName}</p>
              {item.refundedQuantity > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30"
                >
                  {item.refundedQuantity} refunded
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                ${item.unitPrice.toFixed(2)} × {item.originalQuantity}
              </span>
              <span className="text-primary/80">
                {item.refundableQuantity} refundable
              </span>
            </div>
          </div>

          {/* Line total */}
          {item.lineTotal > 0 && (
            <span className="text-sm font-semibold text-destructive tabular-nums shrink-0">
              -${item.lineTotal.toFixed(2)}
            </span>
          )}
        </div>

        {/* Quantity Controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-3"
        >
          <div className="inline-flex items-center rounded-lg border border-border/60 bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-lg"
              disabled={item.refundQuantity <= 0}
              onClick={() =>
                onQuantityChange(Math.max(0, item.refundQuantity - 1))
              }
            >
              <Icon name="Minus" className="h-3 w-3" />
            </Button>

            <Input
              type="number"
              min={0}
              max={item.refundableQuantity}
              value={item.refundQuantity || ""}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                onQuantityChange(Math.min(val, item.refundableQuantity));
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-8 w-12 text-center p-0 font-semibold text-sm tabular-nums border-0 border-x border-border/40 rounded-none focus-visible:ring-0"
              placeholder="0"
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-lg"
              disabled={item.refundQuantity >= item.refundableQuantity}
              onClick={() =>
                onQuantityChange(
                  Math.min(item.refundQuantity + 1, item.refundableQuantity),
                )
              }
            >
              <Icon name="Plus" className="h-3 w-3" />
            </Button>
          </div>

          {item.refundQuantity > 0 &&
            item.refundQuantity < item.refundableQuantity && (
              <span className="text-[11px] text-amber-600 font-medium">
                Partial
              </span>
            )}

          {item.refundQuantity === item.refundableQuantity &&
            item.refundQuantity > 0 && (
              <span className="text-[11px] text-primary font-medium">Full</span>
            )}
        </div>
      </div>
    </div>
  );
};
