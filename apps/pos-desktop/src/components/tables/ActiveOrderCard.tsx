import type { Order } from "@repo/types";
import { Badge, Button, cn, Icon } from "@repo/ui";
import { formatDistanceToNow } from "date-fns";
import { STATUS_BADGE } from "./config";

type ActiveOrderCardProps = {
  order: Order;
  onLoad: (order: Order) => void;
  onTransfer: (orderId: string) => void;
};

export function ActiveOrderCard({
  order,
  onLoad,
  onTransfer,
}: ActiveOrderCardProps) {
  const statusConfig = STATUS_BADGE[order.status] ?? {
    label: order.status,
    className: "bg-muted text-muted-foreground",
  };

  const itemCount = order.items?.length ?? 0;
  const total = parseFloat(String(order.total ?? 0));
  const createdAgo = formatDistanceToNow(new Date(order.createdAt), {
    addSuffix: true,
  });

  return (
    <div className="flex flex-col rounded-lg border bg-card p-3 transition-all hover:shadow-sm">
      <div className="flex items-center justify-between mb-2">
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
        </div>
        <span className="text-xs text-muted-foreground">{createdAgo}</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <Icon name="ShoppingCart" className="h-3 w-3" />
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
        {order.customer && (
          <span className="flex items-center gap-1">
            <Icon name="User" className="h-3 w-3" />
            {(order.customer as any).name}
          </span>
        )}
        <span className="font-bold text-foreground ml-auto">
          ${total.toFixed(2)}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onTransfer(order.id)}
          className="gap-1.5 text-xs"
        >
          <Icon name="ArrowRightLeft" className="h-3 w-3" />
          Transfer
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={() => onLoad(order)}
          className="gap-1.5 text-xs"
        >
          <Icon name="Upload" className="h-3 w-3" />
          Load
        </Button>
      </div>
    </div>
  );
}
