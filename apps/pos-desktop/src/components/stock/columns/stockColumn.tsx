import { ColumnDef } from "@tanstack/react-table";
import { Checkbox, Badge } from "@repo/ui";
import { StockActions } from "@/components/stock/StockActions";
import type { InventoryWithProduct } from "@/dto/inventory.dto";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { format } from "date-fns";

export const stockColumns: ColumnDef<InventoryWithProduct>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "product.name",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.product.name}</div>
        {row.original.product.sku && (
          <div className="text-xs text-gray-500">
            {row.original.product.sku}
          </div>
        )}
      </div>
    ),
  },

  {
    accessorKey: "product.barcode",
    header: "Barcode",
    cell: ({ row }) => row.original.product.barcode || "—",
  },

  {
    accessorKey: "stock",
    header: "Current Stock",
    cell: ({ row }) => {
      const stock = row.original.stock;
      const minStock = row.original.minStock;
      const isLowStock = Number(stock) <= Number(minStock);

      return (
        <div className="flex items-center gap-2">
          <span className={isLowStock ? "text-red-500 font-medium" : ""}>
            {stock}
          </span>
          {isLowStock && (
            <Badge variant="destructive" className="text-xs">
              Low
            </Badge>
          )}
        </div>
      );
    },
  },

  {
    accessorKey: "minStock",
    header: "Min Stock",
    cell: ({ row }) => row.original.minStock,
  },

  {
    accessorKey: "lastAdjusted",
    header: "Last Adjusted",
    cell: ({ row }) => {
      const date = new Date(row.original.lastAdjusted).toLocaleDateString(
        DEFAULT_LOCALE,
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
      return <span>{format(date, "dd, MMM, yyyy")}</span>;
    },
  },

  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const stock = Number(row.original.stock);
      const minStock = Number(row.original.minStock);

      if (stock <= 0) {
        return <Badge variant="destructive">Out of Stock</Badge>;
      } else if (stock <= minStock) {
        return <Badge className="bg-orange-500">Low Stock</Badge>;
      } else {
        return <Badge className="bg-green-500">In Stock</Badge>;
      }
    },
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <StockActions stock={row.original} />,
  },
];
