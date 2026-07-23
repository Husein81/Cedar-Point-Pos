import { useActiveOrdersByTable } from "@/hooks/useTable";
import { Order } from "@repo/types";
import { Button, Icon } from "@repo/ui";

type Props = {
  activeOrderIds?: string[];
  excludeOrderId?: string;
  tableId: string;
  onSelect: (mergeIntoOrderId: string) => void;
  onCancel: () => void;
  isPending: boolean;
};

function MergeTargetSelector({
  activeOrderIds = [],
  excludeOrderId,
  tableId,
  onSelect,
  onCancel,
  isPending,
}: Props) {
  const { data: activeOrders = [], isLoading } =
    useActiveOrdersByTable(tableId);

  let relevantOrders = activeOrders;
  if (activeOrderIds.length > 0) {
    relevantOrders = relevantOrders.filter((o: Order) =>
      activeOrderIds.includes(o.id),
    );
  }
  if (excludeOrderId) {
    relevantOrders = relevantOrders.filter(
      (o: Order) => o.id !== excludeOrderId,
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="LoaderCircle" className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {relevantOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active orders found on this table.
        </p>
      ) : (
        relevantOrders.map((order: Order) => (
          <Button
            key={order.id}
            variant="outline"
            className="w-full justify-between gap-2"
            disabled={isPending}
            onClick={() => onSelect(order.id)}
          >
            <span className="text-sm font-medium">
              Order #{order.orderNumber ?? order.id.slice(-6)}
            </span>
            <span className="text-xs text-muted-foreground">
              {order.items?.length ?? 0} item
              {(order.items?.length ?? 0) !== 1 ? "s" : ""} &middot;{" "}
              {order.status}
            </span>
          </Button>
        ))
      )}

      <Button
        variant="ghost"
        className="justify-start gap-2 text-muted-foreground"
        onClick={onCancel}
        disabled={isPending}
      >
        <Icon name="X" className="h-4 w-4" />
        Cancel
      </Button>
    </div>
  );
}

export default MergeTargetSelector;
