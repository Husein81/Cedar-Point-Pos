import type { RefundableOrderSummary } from "@/dto/refund.dto";
import { useRefundStore } from "@/store/refundStore";
import { Badge, Button, cn, Icon, Shad } from "@repo/ui";
import { format, formatDistanceToNow } from "date-fns";
import {
  formatPaymentMethod,
  getStatusBadge,
  REFUND_ORDERS_PAGE_SIZE,
} from "./config";

interface RefundOrdersListProps {
  orders: RefundableOrderSummary[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
}

export const RefundOrdersList = ({
  orders,
  totalCount,
  isLoading,
  isError,
}: RefundOrdersListProps) => {
  const selectedOrderId = useRefundStore((s) => s.selectedOrderId);
  const selectOrder = useRefundStore((s) => s.selectOrder);
  const page = useRefundStore((s) => s.page);
  const setPage = useRefundStore((s) => s.setPage);

  const totalPages = Math.ceil(totalCount / REFUND_ORDERS_PAGE_SIZE);

  const handleSelect = (orderId: string) => {
    selectOrder(orderId === selectedOrderId ? null : orderId);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Icon name="LoaderCircle" className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <Icon name="CircleAlert" className="w-8 h-8" />
          <span className="text-sm text-center">
            Failed to load refundable orders
          </span>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Icon name="Receipt" className="w-12 h-12 opacity-50" />
          <span className="text-sm font-medium">No refundable orders</span>
          <span className="text-xs text-center">
            Paid and completed orders will appear here
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Count */}
      <div className="px-3 py-2 border-b bg-background shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          {totalCount} order{totalCount !== 1 ? "s" : ""} found
        </span>
      </div>

      {/* Scrollable list */}
      <Shad.ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1.5">
          {orders.map((order) => {
            const badge = getStatusBadge(order.status, order.paymentStatus);
            const isSelected = selectedOrderId === order.id;

            return (
              <button
                key={order.id}
                onClick={() => handleSelect(order.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all",
                  isSelected
                    ? "bg-primary/10 border-primary ring-1 ring-primary"
                    : "bg-background border-transparent hover:border-border hover:bg-muted/50",
                )}
              >
                {/* Order # + status */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm tabular-nums">
                    #{order.orderNumber || order.id.slice(0, 8)}
                  </span>
                  <Badge variant="outline" className={badge.className}>
                    {badge.label}
                  </Badge>
                </div>

                {/* Total + payment */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold tabular-nums">
                    ${order.total.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Icon name="CreditCard" className="w-3 h-3" />
                    {formatPaymentMethod(order.paymentMethod)}
                  </span>
                </div>

                {/* Date + item count */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span title={format(new Date(order.createdAt), "PPpp")}>
                    {formatDistanceToNow(new Date(order.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <span>
                    {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Customer */}
                {order.customerName && (
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Icon name="User" className="w-3 h-3" />
                    {order.customerName}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Shad.ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t bg-background shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <Icon name="ChevronLeft" className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <Icon name="ChevronRight" className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
