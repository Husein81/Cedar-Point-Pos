import { useUpdateKitchenStatus } from "@/hooks/useKitchen";
import { Order, OrderStatus } from "@repo/types";
import { Badge, Button, Icon } from "@repo/ui";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";
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

  return (
    <Shad.Card
      key={order.id}
      className="overflow-hidden h-fit hover:shadow-lg transition-shadow"
    >
      <div className="flex flex-col flex-1 px-4 space-y-4">
        {/* Order Header */}
        <div
          className={`rounded-lg p-3 border ${getOrderTypeHeaderColor(order.type)}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl">{order.type.replace(/_/g, " ")}</h2>
              <Activity mode={order.table ? "visible" : "hidden"}>
                <p className="text-sm text-muted-foreground">
                  {order.table?.name}
                </p>
              </Activity>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <Badge
                className={`${getStatusColor(order.status)} border flex items-center gap-1`}
              >
                <Icon name={getStatusIcon(order.status)} className="w-4 h-4" />
                {order.status.replace(/_/g, " ")}
              </Badge>{" "}
              <h3 className="font-semibold">
                Order #{order.orderNumber || order.id.slice(0, 8)}
              </h3>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-2">
          {order.items?.map((item) => {
            const refundInfo = getItemRefundInfo(item.id);
            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-start gap-2">
                  <span
                    className={`font-semibold min-w-6 ${
                      refundInfo?.isFullyRefunded
                        ? "text-red-500 line-through"
                        : refundInfo?.isPartiallyRefunded
                          ? "text-amber-600"
                          : "text-gray-900"
                    }`}
                  >
                    {refundInfo?.isPartiallyRefunded
                      ? Number(item.quantity) - refundInfo.totalRefunded
                      : item.quantity}
                  </span>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        refundInfo?.isFullyRefunded
                          ? "text-red-500 line-through"
                          : refundInfo?.isPartiallyRefunded
                            ? "text-amber-600"
                            : "text-gray-900"
                      }`}
                    >
                      {item.product?.name}
                    </p>

                    {/* Modifiers */}
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="mt-1 ml-2 space-y-0.5">
                        {item.modifiers.map((mod) => (
                          <p
                            key={mod.id}
                            className="text-xs text-gray-500 italic"
                          >
                            {mod.modifier?.name}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-xs text-gray-500 italic mt-1 ml-2">
                        {item.notes}
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
                      <p className="text-xs text-red-600 italic mt-1 ml-2">
                        {refundInfo.latestReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
          className="w-full"
          disabled={
            getActionButtonStatus(order.status).nextStatus === null ||
            updateStatusMutation.isPending ||
            isFullyRefunded
          }
          isSubmitting={updateStatusMutation.isPending}
        >
          {getActionButtonStatus(order.status).buttonLabel}
        </Button>
      </div>
    </div>
  );
};
export default KitchenCard;
