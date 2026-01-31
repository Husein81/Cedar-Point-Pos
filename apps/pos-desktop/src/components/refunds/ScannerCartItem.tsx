import { type ScannerRefundCartItem } from "@/store/scannerRefundStore";
import { Badge, Button, Checkbox, cn, Icon, Input } from "@repo/ui";
import { formatDistanceToNow } from "date-fns";

interface Props {
  item: ScannerRefundCartItem;
  onQuantityChange: (quantity: number) => void;
  onToggleDamaged: () => void;
  onRemove: () => void;
}

export const ScannerCartItem = ({
  item,
  onQuantityChange,
  onToggleDamaged,
  onRemove,
}: Props) => {
  const orderDateDisplay = item.orderDate
    ? formatDistanceToNow(new Date(item.orderDate), { addSuffix: true })
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition",
        item.isManualRefund
          ? "border-orange-300 bg-orange-50/50"
          : "border-border bg-background",
        item.isDamaged && "border-red-300 bg-red-50/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Product Image */}
        <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden shrink-0 border">
          {item.productImageUrl ? (
            <img
              src={item.productImageUrl}
              alt={item.productName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center">
              <Icon name="Package" className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{item.productName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {item.productSku && <span>SKU: {item.productSku}</span>}
                {item.productBarcode && !item.productSku && (
                  <span>{item.productBarcode}</span>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Icon name="X" className="h-4 w-4" />
            </Button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {item.isManualRefund ? (
              <Badge
                variant="outline"
                className="text-orange-700 border-orange-300 bg-orange-100"
              >
                <Icon name="AlertCircle" className="h-3 w-3 mr-1" />
                Manual Refund
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <Icon name="Receipt" className="h-3 w-3 mr-1" />
                {item.orderNumber || item.orderId?.slice(-6)}
              </Badge>
            )}
            {orderDateDisplay && (
              <Badge variant="secondary" className="text-xs">
                {orderDateDisplay}
              </Badge>
            )}
            {item.isDamaged && (
              <Badge variant="destructive" className="text-xs">
                <Icon name="AlertTriangle" className="h-3 w-3 mr-1" />
                Damaged
              </Badge>
            )}
          </div>

          {/* Quantity & Price Row */}
          <div className="flex items-center justify-between gap-3 mt-3">
            {/* Quantity Control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Qty:</span>
              <div className="inline-flex items-center gap-1 rounded-lg border bg-background p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() =>
                    onQuantityChange(Math.max(1, item.refundQuantity - 1))
                  }
                  disabled={item.refundQuantity <= 1}
                >
                  <Icon name="Minus" className="h-3 w-3" />
                </Button>

                <Input
                  type="number"
                  min={1}
                  max={item.refundableQuantity}
                  value={item.refundQuantity}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 1;
                    onQuantityChange(
                      Math.min(Math.max(1, val), item.refundableQuantity)
                    );
                  }}
                  className="h-6 w-10 text-center p-0 font-semibold tabular-nums"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() =>
                    onQuantityChange(
                      Math.min(item.refundQuantity + 1, item.refundableQuantity)
                    )
                  }
                  disabled={item.refundQuantity >= item.refundableQuantity}
                >
                  <Icon name="Plus" className="h-3 w-3" />
                </Button>
              </div>

              {!item.isManualRefund && (
                <span className="text-xs text-muted-foreground">
                  of {item.refundableQuantity}
                </span>
              )}
            </div>

            {/* Price */}
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">
                @ ${item.unitPrice.toFixed(2)}
              </p>
              <p className="text-lg font-bold text-destructive tabular-nums">
                ${item.lineTotal.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Damaged Toggle */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t">
            <Checkbox
              checked={item.isDamaged}
              onCheckedChange={onToggleDamaged}
              id={`damaged-${item.id}`}
            />
            <label
              htmlFor={`damaged-${item.id}`}
              className="text-xs text-muted-foreground cursor-pointer select-none"
            >
              Item is damaged (won't restock)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
