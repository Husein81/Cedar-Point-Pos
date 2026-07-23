import type { ColumnDef } from "@tanstack/react-table";
import { Badge, Button, cn } from "@repo/ui";
import { formatMoney } from "@/utils/format";
import type { Product } from "@/shared/models";

type Handlers = {
  currencySymbol: string;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export const getProductColumns = ({
  currencySymbol,
  onEdit,
  onDelete,
}: Handlers): ColumnDef<Product>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.sku ?? "—"}</span>
    ),
  },
  {
    id: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.category?.name ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {formatMoney(row.original.price, currencySymbol)}
      </div>
    ),
  },
  {
    accessorKey: "stock",
    header: () => <div className="text-right">Stock</div>,
    cell: ({ row }) => {
      const product = row.original;
      const isLow =
        product.trackInventory &&
        product.lowStockThreshold !== null &&
        product.stock <= product.lowStockThreshold;

      return (
        <div
          className={cn(
            "text-right",
            isLow && "text-destructive font-medium",
          )}
        >
          {product.trackInventory ? product.stock : "—"}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          iconName="Pencil"
          onClick={() => onEdit(row.original)}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          iconName="Trash2"
          onClick={() => onDelete(row.original)}
        />
      </div>
    ),
  },
];
