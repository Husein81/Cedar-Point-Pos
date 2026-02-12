import type { TableWithFloor } from "@/dto/tables.dto";
import { useActiveOrdersByTable } from "@/hooks/useTable";
import { cn } from "@repo/ui";
import { MiniOrderInfo } from "./MiniOrderInfo";

type TransferMergeViewProps = {
  transferTargetTable: TableWithFloor;
  onMerge: (targetOrderId: string) => void;
  isPending: boolean;
};

export function TransferMergeView({
  transferTargetTable,
  onMerge,
  isPending,
}: TransferMergeViewProps) {
  const { data: targetOrders = [], isLoading } = useActiveOrdersByTable(
    transferTargetTable.id,
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (targetOrders.length === 0) {
    return (
      <p className="text-center py-4 text-muted-foreground">
        No active orders found on the target table.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-2">
        Select the order on <strong>{transferTargetTable.name}</strong> to merge
        your transferred order into:
      </p>
      {targetOrders.map((order) => (
        <button
          key={order.id}
          onClick={() => onMerge(order.id)}
          disabled={isPending}
          className={cn(
            "w-full rounded-lg border p-3 hover:bg-accent transition-colors text-left",
            isPending && "opacity-50 cursor-wait",
          )}
        >
          <MiniOrderInfo order={order} />
        </button>
      ))}
    </div>
  );
}
