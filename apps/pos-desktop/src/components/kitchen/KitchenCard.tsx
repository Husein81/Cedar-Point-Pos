import { useUpdateKitchenStatus } from "@/hooks/useKitchen";
import { Order, OrderStatus } from "@repo/types";
import { Badge, Button, cn, Icon, Shad } from "@repo/ui";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";
import {
  getActionButtonStatus,
  getOrderTypeHeaderColor,
  getTimeColor,
} from "./config";

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

  // Calculate refund info
  const isFullyRefunded = order.status === "FULLY_REFUNDED";

  // Helper to check if an item has been refunded
  const getItemRefundInfo = (itemId: string) => {
    const item = order.items?.find((i) => i.id === itemId);
    if (!item || !item.refundItems || item.refundItems.length === 0) {
      return null;
    }

    const totalRefunded = item.refundItems.reduce(
      (sum, refund) => sum + Number(refund.quantity),
      0,
    );
    const isFullyRefunded = totalRefunded >= Number(item.quantity);
    const isPartiallyRefunded = totalRefunded > 0 && !isFullyRefunded;

    return {
      totalRefunded,
      isFullyRefunded,
      isPartiallyRefunded,
      latestReason: item.refundItems[0]?.refund?.reason || null,
    };
  };

  // Get button status info
  const { nextStatus, buttonLabel } = getActionButtonStatus(order.status);

  return (
    <div
      className={cn(
        "bg-card rounded-lg shadow-md overflow-hidden h-fit",
        "border-2 border-transparent hover:border-primary",
        "transition-all duration-200",
        isFullyRefunded && "opacity-70",
      )}
    >
      {/* Colored Header */}
      <div
        className={cn(
          "px-4 py-2 flex items-center justify-between",
          getOrderTypeHeaderColor(order.type),
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">
            #
            {order.table?.tableNumber ||
              order.orderNumber ||
              order.id.slice(0, 4)}
          </span>
          <Icon name="Circle" className="w-1 h-1 text-white fill-white" />
          <span className="text-white text-sm">
            {order.table?.name || order.type.replace(/_/g, " ")}
          </span>
        </div>
        <span className={cn("text-sm", getTimeColor(order.createdAt))}>
          {formatDistanceToNow(new Date(order.createdAt), {
            addSuffix: false,
          })}
        </span>
      </div>

      {/* Order Content */}
      <div className="p-4 space-y-3 min-h-50 relative">
        {/* Refunded Stamp */}
        {isFullyRefunded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="border-4 border-red-500 text-red-500 font-bold text-4xl px-8 py-4 rotate-[-15deg] opacity-80">
              REFUNDED
            </div>
          </div>
        )}

        {/* Items List */}
        <Shad.ScrollArea className="max-h-48 space-y-2 [&>div>div]:pr-3">
          {order.items?.map((item) => {
            const refundInfo = getItemRefundInfo(item.id);
            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-start gap-2">
                  {/* Quantity Badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-bold text-base min-w-8 justify-center h-7 shrink-0",
                      refundInfo?.isFullyRefunded
                        ? "bg-red-500/20 text-red-400 line-through border-red-500/50"
                        : refundInfo?.isPartiallyRefunded
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                          : "bg-primary/20 text-primary border-primary/50",
                    )}
                  >
                    {refundInfo?.isPartiallyRefunded
                      ? Number(item.quantity) - refundInfo.totalRefunded
                      : item.quantity}
                  </Badge>
                  <div className="flex-1">
                    <p
                      className={cn(
                        "font-medium text-foreground",
                        refundInfo?.isFullyRefunded &&
                          "text-red-400 line-through",
                        refundInfo?.isPartiallyRefunded && "text-amber-400",
                      )}
                    >
                      {item.product?.name}
                    </p>

                    {/* Modifiers */}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="mt-1 ml-1 flex flex-wrap gap-1">
                        {item.modifiers.map((mod) => (
                          <Badge
                            key={mod.id}
                            variant="secondary"
                            className="text-xs font-normal py-0 h-5"
                          >
                            + {mod.modifier?.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-xs text-gray-500 italic mt-1 ml-1">
                        "{item.notes}"
                      </p>
                    )}

                    {/* Refund Badge */}
                    {refundInfo?.isFullyRefunded && (
                      <Badge className="mt-1 bg-red-100 text-red-700 border-red-300 text-xs">
                        REFUNDED
                      </Badge>
                    )}
                    {refundInfo?.isPartiallyRefunded && (
                      <Badge className="mt-1 bg-amber-100 text-amber-700 border-amber-300 text-xs">
                        {refundInfo.totalRefunded} REFUNDED
                      </Badge>
                    )}

                    {/* Refund Reason */}
                    {refundInfo?.latestReason && (
                      <p className="text-xs text-red-600 italic mt-1 ml-1">
                        {refundInfo.latestReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </Shad.ScrollArea>
      </div>

      {/* Footer Button */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 uppercase font-medium">
          <Icon name="Utensils" className="w-3 h-3" />
          <span>
            {order.type === "DINE_IN"
              ? "DINE IN"
              : order.type === "DELIVERY"
                ? "DELIVERY"
                : order.type === "TAKEAWAY"
                  ? "TO GO"
                  : order.type.replace(/_/g, " ")}
          </span>
        </div>
        <Button
          onClick={onActionButtonClick}
          className={cn(
            "w-full",
            nextStatus === OrderStatus.READY && "bg-green-600 hover:bg-green-700",
            nextStatus === OrderStatus.COMPLETED && "bg-emerald-600 hover:bg-emerald-700",
          )}
          disabled={
            nextStatus === null ||
            updateStatusMutation.isPending ||
            isFullyRefunded
          }
          isSubmitting={updateStatusMutation.isPending}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
};
export default KitchenCard;

