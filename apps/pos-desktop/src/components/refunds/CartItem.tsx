import { Badge, Button, Checkbox, cn, Icon, Input } from "@repo/ui";
import { useBaseCurrency } from "@/hooks/useCurrency";
import type { RefundLine } from "./config";

interface Props {
  line: RefundLine;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
}

const ProductThumb = ({ line }: { line: RefundLine }) => (
  <div className="h-10 w-10 rounded-lg bg-muted/40 overflow-hidden shrink-0 border border-border/30">
    {line.productImageUrl ? (
      <img
        src={line.productImageUrl}
        alt={line.productName}
        className="h-full w-full object-cover"
      />
    ) : (
      <div className="h-full w-full grid place-items-center">
        <Icon name="Package" className="h-4 w-4 text-muted-foreground" />
      </div>
    )}
  </div>
);

export const CartItem = ({ line, onToggle, onQuantityChange }: Props) => {
  const { format: formatMoney } = useBaseCurrency();

  // Fully refunded items — muted row with badge
  if (line.refundableQuantity <= 0) {
    return (
      <div className="flex items-center gap-4 px-5 py-4 opacity-50">
        <ProductThumb line={line} />

        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{line.productName}</p>
          <p className="text-xs text-muted-foreground">
            {formatMoney(line.unitPrice)} × {line.quantity}
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
        line.isSelected ? "bg-primary/5" : "hover:bg-muted/30",
      )}
    >
      <Checkbox
        checked={line.isSelected}
        className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        onChange={onToggle}
      />

      <ProductThumb line={line} />

      <div className="flex-1 min-w-0 space-y-2">
        {/* Name + line total */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{line.productName}</p>
              {line.refundedQuantity > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                >
                  {line.refundedQuantity} refunded
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {formatMoney(line.unitPrice)} × {line.quantity}
              </span>
              <span className="text-primary/80">
                {line.refundableQuantity} refundable
              </span>
            </div>
          </div>

          {line.lineTotal > 0 && (
            <span className="text-sm font-semibold text-destructive tabular-nums shrink-0">
              -{formatMoney(line.lineTotal)}
            </span>
          )}
        </div>

        {/* Quantity controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2"
        >
          <div className="inline-flex items-center rounded-lg border border-border/60 bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-lg"
              disabled={line.refundQuantity <= 0}
              onClick={() => onQuantityChange(line.refundQuantity - 1)}
            >
              <Icon name="Minus" className="h-3 w-3" />
            </Button>

            <Input
              type="number"
              min={0}
              max={line.refundableQuantity}
              value={line.refundQuantity || ""}
              onChange={(e) => onQuantityChange(Number(e.target.value) || 0)}
              className="h-8 w-12 text-center p-0 font-semibold text-sm tabular-nums border-0 border-x border-border/40 rounded-none focus-visible:ring-0"
              placeholder="0"
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-lg"
              disabled={line.refundQuantity >= line.refundableQuantity}
              onClick={() => onQuantityChange(line.refundQuantity + 1)}
            >
              <Icon name="Plus" className="h-3 w-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            disabled={line.refundQuantity >= line.refundableQuantity}
            onClick={() => onQuantityChange(line.refundableQuantity)}
          >
            All
          </Button>

          {line.refundQuantity > 0 &&
            (line.refundQuantity < line.refundableQuantity ? (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Partial
              </span>
            ) : (
              <span className="text-[11px] text-primary font-medium">Full</span>
            ))}
        </div>
      </div>
    </div>
  );
};
