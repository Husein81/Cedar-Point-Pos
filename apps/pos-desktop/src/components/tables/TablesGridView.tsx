import { Badge, Empty, Icon, Skeleton, cn } from "@repo/ui";
import type { TableOverview } from "@/dto/tables.dto";
import {
  TABLE_UI_STATUS_CONFIG,
  deriveTableUiStatus,
  formatElapsedSince,
  formatTableMoney,
} from "./config";
import { useElapsedNow } from "./useElapsedNow";

interface TablesGridViewProps {
  tables: TableOverview[];
  selectedTableId: string | null;
  isLoading: boolean;
  onSelect: (tableId: string) => void;
}

/**
 * Compact list alternative to the floor canvas (kitchen displays, quick
 * scanning). Same selection → drawer flow; grouped by floor.
 */
export function TablesGridView({
  tables,
  selectedTableId,
  isLoading,
  onSelect,
}: TablesGridViewProps) {
  const now = useElapsedNow();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <Empty
        icon="LayoutGrid"
        title="No tables match"
        description="Adjust the filters or search to find tables."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 pb-4 md:grid-cols-3 xl:grid-cols-5">
      {tables.map((table) => {
        const uiStatus = deriveTableUiStatus(table, table.activeOrder?.status);
        const config = TABLE_UI_STATUS_CONFIG[uiStatus];
        const order = table.activeOrder;
        const isSelected = table.id === selectedTableId;

        return (
          <button
            key={table.id}
            type="button"
            onClick={() => onSelect(table.id)}
            className={cn(
              "flex flex-col gap-1.5 rounded-xl border-2 p-3 text-left transition-all",
              "hover:-translate-y-0.5 hover:shadow-md",
              config.node,
              isSelected && "ring-primary ring-2 ring-offset-2",
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-foreground text-2xl font-black tracking-tight">
                {table.tableNumber}
              </span>
              <Badge variant="outline" className={cn("shrink-0", config.badge)}>
                <Icon name={config.icon} className="mr-1 h-3 w-3" />
                {config.label}
              </Badge>
            </div>

            <p className="text-muted-foreground w-full truncate text-xs font-medium">
              {table.floor ? `${table.floor.name} · ` : ""}
              {table.name}
            </p>

            <div className="text-muted-foreground mt-auto flex w-full items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Icon name="Users" className="h-3 w-3" />
                {order?.guestCount ?? 0}/{table.capacity}
              </span>
              {order && (
                <>
                  <span className="flex items-center gap-1">
                    <Icon name="Timer" className="h-3 w-3" />
                    {formatElapsedSince(order.createdAt, now)}
                  </span>
                  <span className={cn("ml-auto font-semibold", config.text)}>
                    {formatTableMoney(order.total)}
                  </span>
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
