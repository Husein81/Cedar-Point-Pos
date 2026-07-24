import type { Order } from "@repo/types";
import { Badge, cn } from "@repo/ui";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { STATUS_BADGE_CONFIG } from "./config";

type MiniOrderInfoProps = {
  order: Order;
};

export function MiniOrderInfo({ order }: MiniOrderInfoProps) {
  const { format: formatMoney } = useBaseCurrency();
  const statusConfig = STATUS_BADGE_CONFIG[order.status] ?? {
    label: order.status,
    className: "bg-muted text-muted-foreground",
  };

  const itemCount = order.items?.length ?? 0;
  const total = parseFloat(String(order.total ?? 0));

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">
          {order.orderNumber ? `#${order.orderNumber}` : "Order"}
        </span>
        <Badge
          variant="outline"
          className={cn("text-xs", statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
      </div>
      <span className="font-bold text-sm">{formatMoney(total)}</span>
    </div>
  );
}
