import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@repo/ui";
import type { InventoryHistory } from "@repo/types";
import { format } from "date-fns";

export const inventoryHistoryColumns: ColumnDef<
  InventoryHistory & {
    product?: { name: string; sku: string | null };
    user?: { name: string; username: string };
  }
>[] = [
  {
    accessorKey: "product.name",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">
          {row.original.product?.name || "Unknown"}
        </div>
        {row.original.product?.sku && (
          <div className="text-xs text-gray-500">
            {row.original.product.sku}
          </div>
        )}
      </div>
    ),
  },

  {
    accessorKey: "changeType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.changeType;
      const variants: Record<string, { label: string; variant: any }> = {
        SET_STOCK: { label: "Set Stock", variant: "default" },
        ADJUST_STOCK: { label: "Stock In", variant: "default" },
        MANUAL_ADJUST: { label: "Stock Out", variant: "secondary" },
        ORDER_DEDUCTION: { label: "Order (Legacy)", variant: "destructive" },
        SALE: { label: "Sale", variant: "destructive" },
        REFUND: { label: "Refund", variant: "default" },
        TRANSFER_OUT: { label: "Transfer Out", variant: "destructive" },
        TRANSFER_IN: { label: "Transfer In", variant: "default" },
      };

      const config = variants[type] || {
        label: type,
        variant: "default",
      };

      return (
        <Badge variant={config.variant}>
          {config.label.split("_").join(" ")}
        </Badge>
      );
    },
  },

  {
    accessorKey: "beforeStock",
    header: "Before",
    cell: ({ row }) => Number(row.original.beforeStock).toFixed(2),
  },

  {
    accessorKey: "adjustment",
    header: "Change",
    cell: ({ row }) => {
      const adjustment = Number(row.original.adjustment);
      const isPositive = adjustment >= 0;
      return (
        <span
          className={
            isPositive
              ? "text-green-600 font-medium"
              : "text-red-600 font-medium"
          }
        >
          {isPositive ? "+" : ""}
          {adjustment.toFixed(2)}
        </span>
      );
    },
  },

  {
    accessorKey: "afterStock",
    header: "After",
    cell: ({ row }) => Number(row.original.afterStock).toFixed(2),
  },

  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <div className="max-w-xs truncate text-sm text-gray-600">
        {row.original.reason || "—"}
      </div>
    ),
  },

  {
    accessorKey: "user.name",
    header: "User",
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.user?.name || row.original.user?.username || "—"}
      </div>
    ),
  },

  {
    accessorKey: "createdAt",
    header: "Date & Time",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return (
        <div className="text-sm">
          <div>{format(date, "dd, MMM, yyyy")}</div>
          <div className="text-xs text-gray-500">{format(date, "hh:mm a")}</div>
        </div>
      );
    },
  },
];
