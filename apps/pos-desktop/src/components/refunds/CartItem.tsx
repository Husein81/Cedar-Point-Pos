import { type RefundCartItem } from "@/store/refundStore";
import { Button, Checkbox, cn, Icon, Input } from "@repo/ui";

interface Props {
  item: RefundCartItem;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
}

export const CartItem = ({ item, onToggle, onQuantityChange }: Props) => {
  const isDisabled = item.refundableQuantity <= 0;

  return (
    <button
      onClick={onToggle}
      disabled={isDisabled}
      className={cn(
        "w-full text-left rounded-lg border p-3 transition",
        "hover:bg-muted/40",
        item.isSelected
          ? "border-destructive/40 bg-destructive/5"
          : "border-border",
        isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Selection Indicator */}
        <Checkbox
          checked={item.isSelected}
          disabled={isDisabled}
          className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
          onChange={onToggle}
        />

        {/* Image */}
        <div className="h-12 w-12 rounded-md bg-muted overflow-hidden shrink-0 border">
          {item.productImageUrl ? (
            <img
              src={item.productImageUrl}
              alt={item.productName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center">
              <Icon name="Package" className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {item.productName}
              </p>
              {item.productSku && (
                <p className="text-[11px] text-muted-foreground truncate">
                  SKU: {item.productSku}
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <p className="text-[11px] text-muted-foreground">
                ${item.unitPrice.toFixed(2)}
              </p>
              {item.lineTotal > 0 && (
                <p className="text-lg font-bold text-destructive tabular-nums leading-tight">
                  ${item.lineTotal.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Qty meta */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>Ordered: {item.originalQuantity}</span>
            {item.refundedQuantity > 0 && (
              <span className="text-orange-600">
                Refunded: {item.refundedQuantity}
              </span>
            )}
            <span className="text-primary">
              Refundable: {item.refundableQuantity}
            </span>
          </div>

          {/* Qty control */}
          {item.refundableQuantity > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1 rounded-lg border bg-background p-1"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6"
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
                value={item.refundQuantity}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  onQuantityChange(Math.min(val, item.refundableQuantity));
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-6 w-12 text-center p-0 font-semibold tabular-nums"
              />

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6"
                onClick={() =>
                  onQuantityChange(
                    Math.min(item.refundQuantity + 1, item.refundableQuantity)
                  )
                }
              >
                <Icon name="Plus" className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};
