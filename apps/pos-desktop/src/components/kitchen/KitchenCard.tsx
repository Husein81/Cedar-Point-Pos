import { useUpdateKitchenStatus } from "@/hooks/useKitchen";
import { Order, OrderStatus } from "@repo/types";
import { Badge, Button, Icon, Shad } from "@repo/ui";
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
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden h-fit transition-shadow hover:shadow-lg ${
        isFullyRefunded ? "opacity-70" : ""
      }`}
    >
      {/* Colored Header */}
      <div
        className={`px-4 py-2 flex items-center justify-between ${getOrderTypeHeaderColor(order.type)}`}
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
        <span className="text-white text-sm font-medium">
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
        <Shad.ScrollArea className="min-h-0 space-y-2">
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
