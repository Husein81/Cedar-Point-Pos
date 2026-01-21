import { Button, cn, Icon, Shad } from "@repo/ui";
import { useRefundStore } from "@/store/refundStore";
import { OrderStatus } from "@repo/types";
import { formatDistanceToNow, format } from "date-fns";

interface RefundOrdersListProps {
  onOrderSelect: (orderId: string) => void;
  selectedOrderId: string | null;
}

/**
 * Left panel - scrollable list of refundable orders
 */
export const RefundOrdersList = ({
  onOrderSelect,
  selectedOrderId,
}: RefundOrdersListProps) => {
  const {
    orders,
    ordersLoading,
    ordersError,
    ordersTotalCount,
    ordersCurrentPage,
    ordersPageSize,
    setOrdersPage,
  } = useRefundStore();

  const totalPages = Math.ceil(ordersTotalCount / ordersPageSize);

  const getStatusBadge = (status: OrderStatus, hasRefunds: boolean) => {
    // ✅ First check if order is fully refunded (highest priority)
    if (status === OrderStatus.FULLY_REFUNDED) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
          Fully Refunded
        </span>
      );
    }

    // Then check if partially refunded
    if (hasRefunds) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
          Partially Refunded
        </span>
      );
    }

    switch (status) {
      case OrderStatus.COMPLETED:
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return "N/A";
    return method.charAt(0) + method.slice(1).toLowerCase();
  };

  if (ordersLoading && orders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Icon name="LoaderCircle" className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <Icon name="CircleAlert" className="w-8 h-8" />
          <span className="text-sm text-center">{ordersError}</span>
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
            Orders with status COMPLETED will appear here
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Orders Count */}
      <div className="px-3 py-2 border-b bg-background">
        <span className="text-xs font-medium text-muted-foreground">
          {ordersTotalCount} order{ordersTotalCount !== 1 ? "s" : ""} found
        </span>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t bg-background">
          <Button
            variant="outline"
            size="sm"
            disabled={ordersCurrentPage <= 1}
            onClick={() => setOrdersPage(ordersCurrentPage - 1)}
          >
            <Icon name="ChevronLeft" className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {ordersCurrentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={ordersCurrentPage >= totalPages}
            onClick={() => setOrdersPage(ordersCurrentPage + 1)}
          >
            <Icon name="ChevronRight" className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Scrollable List */}
      <Shad.ScrollArea className="flex-1 min-h-0 ">
        <div className="p-2 space-y-1">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => onOrderSelect(order.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all",
                "hover:bg-accent hover:border-accent-foreground/20 hover:text-white",
                selectedOrderId === order.id
                  ? "bg-primary/10 border-primary ring-1 ring-primary"
                  : "bg-background border-transparent"
              )}
            >
              {/* Top Row: Order # + Status */}
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">
                  #{order.orderNumber || order.id.slice(-8)}
                </span>
                {/* TODO */}
                {getStatusBadge(order.status as OrderStatus, false)}
              </div>

              {/* Middle Row: Total + Payment */}
              <div className="flex items-center justify-between  mb-1">
                <span className="text-lg font-bold">
                  ${order.total.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Icon name="CreditCard" className="w-3 h-3" />
                  {formatPaymentMethod(order.paymentMethod)}
                </span>
              </div>

              {/* Bottom Row: Date + Items */}
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

              {/* Customer (if exists) */}
              {order.customerName && (
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Icon name="User" className="w-3 h-3" />
                  {order.customerName}
                </div>
              )}
            </button>
          ))}
        </div>
      </Shad.ScrollArea>
    </div>
  );
};
