import { TablePaymentForm } from "@/components/tables/TablePaymentForm";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { useFetchOrder, useUnpaidDeliveryOrders } from "@/hooks/useOrder";
import { useModalStore } from "@/store/modalStore";
import { extractErrorMessage } from "@/utils/error";
import { OrderStatus } from "@repo/types";
import { Badge, Icon, Shad, toast } from "@repo/ui";

/** Fulfillment badge — how far along the kitchen is with this delivery. */
const statusLabels: Record<string, string> = {
  [OrderStatus.DRAFT]: "Not sent",
  [OrderStatus.PLACED]: "Placed",
  [OrderStatus.PREPARING]: "Preparing",
  [OrderStatus.READY]: "With driver",
};

/**
 * Delivery orders awaiting their money. A delivery closes when the cashier
 * records the cash the driver brings back, so this is the one surface that
 * needs to exist — taking the payment here completes the order.
 */
export function DeliveryOrdersModal() {
  const { orders, isLoading, error } = useUnpaidDeliveryOrders();
  const { openModal } = useModalStore();
  const { format: formatMoney } = useBaseCurrency();
  const fetchOrder = useFetchOrder();

  const handleTakePayment = async (orderId: string) => {
    try {
      // Re-fetch so the outstanding amount reflects any partial payment
      // already recorded against this order.
      const full = await fetchOrder(orderId);
      const payments =
        (full as unknown as {
          payments?: Array<{ amount?: number | string | null }>;
        })?.payments ?? [];
      const paid = payments.reduce(
        (sum, payment) => sum + Number(payment?.amount ?? 0),
        0,
      );
      const remaining = Math.max(0, Number(full?.total ?? 0) - paid);

      openModal(
        "Take Payment",
        <TablePaymentForm orderId={orderId} total={remaining} />,
        `Order #${full?.orderNumber || orderId.slice(0, 8)}`,
      );
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to open payment"));
    }
  };

  return (
    <div className="px-2">
      <p className="text-muted-foreground mb-3 text-sm">
        Deliveries still owing money. Recording the payment completes the order.
      </p>

      <Shad.ScrollArea className="max-h-96">
        <div className="flex flex-col gap-1 pr-3">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Icon
                name="LoaderCircle"
                className="text-muted-foreground h-6 w-6 animate-spin"
              />
            </div>
          )}

          {!isLoading && error && (
            <div className="py-10 text-center">
              <Icon
                name="AlertCircle"
                className="text-destructive mx-auto mb-2 h-10 w-10"
              />
              <p className="text-muted-foreground text-sm">
                Failed to load delivery orders
              </p>
            </div>
          )}

          {!isLoading && !error && orders.length === 0 && (
            <div className="py-10 text-center">
              <Icon
                name="Truck"
                className="text-muted-foreground mx-auto mb-2 h-10 w-10"
              />
              <p className="text-muted-foreground text-sm">
                No deliveries awaiting payment
              </p>
            </div>
          )}

          {!isLoading &&
            !error &&
            orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => void handleTakePayment(order.id)}
                className="border-border hover:bg-accent/50 flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors"
              >
                <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Icon name="Truck" className="text-primary h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {order.orderNumber
                      ? `#${order.orderNumber}`
                      : order.id.slice(0, 8)}
                    {order.customer?.name ? ` · ${order.customer.name}` : ""}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {order.customer?.address || "No address"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(order.total)}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {statusLabels[order.status] ?? order.status}
                  </Badge>
                </div>
              </button>
            ))}
        </div>
        <Shad.ScrollBar />
      </Shad.ScrollArea>
    </div>
  );
}
