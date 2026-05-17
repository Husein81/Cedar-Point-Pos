import { useUpdateKitchenStatus } from "@/hooks/useKitchen";
import { Order, OrderStatus } from "@repo/types";
import { Badge, Button, cn, Icon } from "@repo/ui";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useMemo } from "react";
import { getActionButtonStatus, getOrderTypeHeaderColor } from "./config";

type Props = {
  order: Order;
};

const KitchenCard = ({ order }: Props) => {
  const updateStatusMutation = useUpdateKitchenStatus();

  const handleStatusChange = useCallback(
    (orderId: string, status: OrderStatus) => {
      updateStatusMutation.mutate({ orderId, status });
    },
    [updateStatusMutation],
  );

  const onActionButtonClick = useCallback(() => {
    const { nextStatus } = getActionButtonStatus(order.status);

    if (nextStatus) {
      handleStatusChange(order.id, nextStatus);
    }
  }, [order.id, order.status, handleStatusChange]);

  const isFullyRefunded = order.status === "FULLY_REFUNDED";

  const elapsedMinutes = useMemo(() => {
    return Math.floor(
      (Date.now() - new Date(order.createdAt).getTime()) / 60000,
    );
  }, [order.createdAt]);

  const urgencyColor = useMemo(() => {
    if (elapsedMinutes >= 30) {
      return "text-red-500";
    }

    if (elapsedMinutes >= 15) {
      return "text-amber-500";
    }

    return "text-emerald-500";
  }, [elapsedMinutes]);

  const getItemRefundInfo = (itemId: string) => {
    const item = order.items?.find((i) => i.id === itemId);

    if (!item || !item.refundItems?.length) {
      return null;
    }

    const totalRefunded = item.refundItems.reduce(
      (sum, refund) => sum + Number(refund.quantity),
      0,
    );

    return {
      totalRefunded,
      isFullyRefunded: totalRefunded >= Number(item.quantity),
      isPartiallyRefunded:
        totalRefunded > 0 && totalRefunded < Number(item.quantity),
    };
  };

  const { nextStatus, buttonLabel } = getActionButtonStatus(order.status);

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all",
        "hover:border-primary/40 hover:shadow-md",
        isFullyRefunded && "opacity-70",
      )}
    >
      {/* HEADER */}
      <div className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg text-sm font-bold text-white",
                getOrderTypeHeaderColor(order.type),
              )}
            >
              #{order.table?.tableNumber || order.id.slice(0, 2)}
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-semibold">
                {order.table?.name || order.type.replace(/_/g, " ")}
              </h2>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon name="Clock3" className="size-3.5" />

                <span className={cn("font-medium ", urgencyColor)}>
                  {formatDistanceToNow(new Date(order.createdAt), {
                    addSuffix: false,
                  })}
                </span>

                <span>•</span>

                <span>{order.items?.length || 0} items</span>
              </div>
            </div>
          </div>

          <Badge
            variant="secondary"
            className="rounded-full px-2.5 py-1 text-[11px]"
          >
            {order.type === "DINE_IN"
              ? "Dine In"
              : order.type === "DELIVERY"
                ? "Delivery"
                : order.type === "TAKEAWAY"
                  ? "Takeaway"
                  : order.type.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {/* ITEMS */}
      <div className="flex-1 space-y-3 p-4">
        {order.items?.map((item) => {
          const refundInfo = getItemRefundInfo(item.id);

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border p-3",
                refundInfo?.isFullyRefunded &&
                  "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
                refundInfo?.isPartiallyRefunded &&
                  "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
              )}
            >
              <div className="flex gap-3">
                {/* QTY */}
                <div
                  className={cn(
                    "flex h-9 min-w-9 items-center justify-center rounded-lg text-sm font-bold",
                    refundInfo?.isFullyRefunded
                      ? "bg-red-500 text-white"
                      : refundInfo?.isPartiallyRefunded
                        ? "bg-amber-500 text-black"
                        : "bg-primary/10 text-primary",
                  )}
                >
                  {refundInfo?.isPartiallyRefunded
                    ? Number(item.quantity) - refundInfo.totalRefunded
                    : item.quantity}
                </div>

                {/* CONTENT */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium leading-5",
                        refundInfo?.isFullyRefunded &&
                          "line-through opacity-70",
                      )}
                    >
                      {item.product?.name}
                    </p>

                    {refundInfo?.isFullyRefunded && (
                      <Badge variant="destructive" className="text-[10px]">
                        Refunded
                      </Badge>
                    )}
                  </div>

                  {/* MODIFIERS */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.modifiers.map((mod) => (
                        <div
                          key={mod.id}
                          className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                        >
                          + {mod.modifier?.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* NOTES */}
                  {item.notes && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted p-2">
                      <Icon
                        name="NotebookPen"
                        className="mt-0.5 size-3 text-muted-foreground"
                      />

                      <p className="text-xs text-muted-foreground">
                        {item.notes}
                      </p>
                    </div>
                  )}

                  {/* PARTIAL REFUND */}
                  {refundInfo?.isPartiallyRefunded && (
                    <p className="mt-2 text-xs font-medium text-amber-600">
                      {refundInfo.totalRefunded} refunded
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="border-t p-4">
        <Button
          onClick={onActionButtonClick}
          disabled={
            nextStatus === null ||
            updateStatusMutation.isPending ||
            isFullyRefunded
          }
          isSubmitting={updateStatusMutation.isPending}
          className={cn(
            "h-11 w-full rounded-lg font-semibold",
            nextStatus === OrderStatus.READY &&
              "bg-green-600 hover:bg-green-700",
            nextStatus === OrderStatus.COMPLETED &&
              "bg-emerald-600 hover:bg-emerald-700",
          )}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
};

export default KitchenCard;
