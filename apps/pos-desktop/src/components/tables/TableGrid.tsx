import type { TableWithFloor } from "@/dto/tables.dto";
import { TableCard } from "./TableCard";
import { Empty } from "@repo/ui";

type Props = {
  tables: TableWithFloor[];
  onTableClick?: (table: TableWithFloor) => void;
  isLoading?: boolean;
};

export function TableGrid({ tables, onTableClick, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-52 bg-muted animate-pulse rounded-lg border-2 border-muted"
          />
        ))}
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <Empty
        icon="LayoutGrid"
        title="No tables found"
        description="Add your first table to start managing your restaurant floor."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {tables.map((table) => (
        <TableCard key={table.id} table={table} onClick={onTableClick} />
      ))}
    </div>
  );
}
