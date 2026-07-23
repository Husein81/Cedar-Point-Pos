import type { ColumnDef } from "@tanstack/react-table";
import { Badge, cn } from "@repo/ui";
import { StockMovementType } from "@/shared/enums";
import { formatDate } from "@/utils/format";
import type { StockMovement } from "@/shared/models";

const movementBadge = (type: string) => {
  switch (type) {
    case StockMovementType.SALE:
      return "secondary" as const;
    case StockMovementType.REFUND:
    case StockMovementType.PURCHASE:
      return "default" as const;
    default:
      return "outline" as const;
  }
};

export const getStockMovementColumns = (): ColumnDef<StockMovement>[] => [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.productName ?? "—"}</span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant={movementBadge(row.original.type)}>
        {row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Quantity</div>,
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      return (
        <div
          className={cn(
            "text-right font-medium",
            quantity > 0 ? "text-green-600" : "text-destructive",
          )}
        >
          {quantity > 0 ? "+" : ""}
          {quantity}
        </div>
      );
    },
  },
  {
    accessorKey: "reason",
    header: "Reference",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.reason ?? "—"}
      </span>
    ),
  },
];
