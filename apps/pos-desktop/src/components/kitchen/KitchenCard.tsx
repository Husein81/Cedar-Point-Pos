import { useUpdateKitchenStatus } from "@/hooks/useKitchen";
import { Order, OrderStatus } from "@repo/types";
import { Badge, Button, cn, Icon } from "@repo/ui";
import { formatDistanceToNowStrict } from "date-fns";
import { Activity, useCallback, useMemo } from "react";
import { getActionButtonStatus } from "./config";

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

  const elapsedMinutes = useMemo(() => {
    return Math.floor(
      (Date.now() - new Date(order.createdAt).getTime()) / 60000,
    );
  }, [order.createdAt]);

  const timerColor = useMemo(() => {
    if (elapsedMinutes >= 30) {
      return "bg-red-500";
    }

    if (elapsedMinutes >= 15) {
      return "bg-orange-500";
    }

    return "bg-rose-400";
  }, [elapsedMinutes]);

  const formattedTime = useMemo(() => {
    return formatDistanceToNowStrict(new Date(order.createdAt));
  }, [order.createdAt]);

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

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm",
        "transition-all duration-200 hover:shadow-md",
        {
          "border-success": order.status === "COMPLETED",
          "border-error": order.status === "CANCELLED",
        },
      )}
    >
      {/* TOP HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="font-semibold text-zinc-700">
            {order.table?.tableNumber ?? "--"}
          </span>

          <span>#{order.orderNumber || order.id.slice(0, 4)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Icon name="ChefHat" className="size-3.5 text-zinc-400" />

          <span className="text-[11px] text-zinc-500">
            {order.user?.name || "Kitchen"}
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col gap-3 p-3">
        {/* STATUS */}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "rounded-md bg-zinc-100 px-2 py-1 text-[11px] capitalize  font-medium text-zinc-600",
              order.status === "COMPLETED" && "bg-success text-white",
            )}
          >
            {order.status.split("_").join(" ").toLocaleLowerCase()}
          </div>

          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-white",
              timerColor,
            )}
          >
            <Icon name="Clock3" className="size-3" />

            <span>{formattedTime}</span>
          </div>
        </div>

        {/* ITEMS */}
        <div className="space-y-3">
          {order.items?.map((item) => {
            const refundInfo = getItemRefundInfo(item.id);

            if (refundInfo?.isFullyRefunded) {
              return null;
            }

            const quantity = refundInfo?.isPartiallyRefunded
              ? Number(item.quantity) - refundInfo.totalRefunded
              : item.quantity;

            return (
              <div key={item.id} className="space-y-1">
                {/* ITEM */}
                <div className="flex items-start gap-2">
                  <span className="min-w-[20px] text-sm font-semibold text-zinc-700">
                    {quantity}x
                  </span>

                  <p
                    className={cn(
                      "text-sm font-medium leading-5 text-zinc-800",
                      refundInfo?.isPartiallyRefunded && "text-amber-600",
                    )}
                  >
                    {item.product?.name}
                  </p>
                </div>

                {/* MODIFIERS */}
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="ml-6 flex flex-col gap-1">
                    {item.modifiers.map((mod) => (
                      <p key={mod.id} className="text-xs text-zinc-500">
                        - {mod.modifier?.name}
                      </p>
                    ))}
                  </div>
                )}

                {/* NOTES */}
                {item.notes && (
                  <div className="ml-6 rounded bg-amber-50 px-2 py-1">
                    <p className="text-xs text-amber-700">{item.notes}</p>
                  </div>
                )}

                {/* PARTIAL REFUND */}
                {refundInfo?.isPartiallyRefunded && (
                  <div className="ml-6">
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-[10px] text-amber-700"
                    >
                      {refundInfo.totalRefunded} refunded
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <Activity mode={order.status === "COMPLETED" ? "hidden" : "visible"}>
        <div className="border-t border-zinc-100 p-3">
          <Button
            onClick={onActionButtonClick}
            disabled={updateStatusMutation.isPending}
            isSubmitting={updateStatusMutation.isPending}
            className={cn(
              "h-9 w-full rounded-md text-sm font-semibold text-white",
            )}
          >
            {getActionButtonStatus(order.status).buttonLabel}
          </Button>
        </div>
      </Activity>
    </div>
  );
};

export default KitchenCard;
