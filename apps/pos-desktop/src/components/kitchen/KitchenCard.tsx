import { useUpdateKitchenStatus } from "@/hooks/useKitchen";
import { Order, OrderStatus } from "@repo/types";
import { Badge, Button, Icon, Separator, Shad } from "@repo/ui";
import { formatDistanceToNow } from "date-fns";
import { getActionButtonStatus, getStatusColor, getStatusIcon } from "./config";

type Props = {
  order: Order;
};

const KitchenCard = ({ order }: Props) => {
  const updateStatusMutation = useUpdateKitchenStatus();

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateStatusMutation.mutate({ orderId, status });
  };

  const onActionButtonClick = () => {
    const { nextStatus } = getActionButtonStatus(order.status);
    if (nextStatus) {
      handleStatusChange(order.id, nextStatus);
    }
  };

  return (
    <Shad.Card
      key={order.id}
      className="overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="flex flex-col flex-1 px-4 space-y-4">
        {/* Order Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">
              Order #{order.orderNumber || order.id.slice(0, 8)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {order.table?.name || "Takeout"}
            </p>
          </div>
          <Badge
            className={`${getStatusColor(order.status)} border flex items-center gap-1`}
          >
            <Icon name={getStatusIcon(order.status)} className="w-4 h-4" />
            {order.status.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon name="Clock" className="w-4 h-4" />
          {formatDistanceToNow(new Date(order.createdAt), {
            addSuffix: true,
          })}
        </div>

        <Separator />

        {/* Order Items */}
        <div className="flex-1 space-y-2 pt-4">
          {order.items?.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">
                    {item.quantity}x {item.product?.name}
                  </p>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      Note: {item.notes}
                    </p>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-xs text-muted-foreground ml-4">
                      {item.modifiers.map((mod) => (
                        <div key={mod.id}>+ {mod.modifier?.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <Separator />
        </div>

        {/* Action Buttons */}
        <Button
          onClick={onActionButtonClick}
          className="w-full"
          variant="default"
          disabled={
            getActionButtonStatus(order.status).nextStatus === null ||
            updateStatusMutation.isPending
          }
          isSubmitting={updateStatusMutation.isPending}
        >
          {getActionButtonStatus(order.status).buttonLabel}
        </Button>
      </div>
    </Shad.Card>
  );
};
export default KitchenCard;
