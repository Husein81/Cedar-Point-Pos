import { ColumnDef } from "@tanstack/react-table";
import { Product } from "@repo/types";
import { Checkbox } from "@repo/ui";
import { Badge } from "@repo/ui";
import { ProductActions } from "@/components/products/ProductActions";

export const productColumns: ColumnDef<Product>[] = [
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
    accessorKey: "imageUrl",
    header: "Image",
    cell: ({ row }) =>
      row.original.imageUrl ? (
        <img
          src={row.original.imageUrl}
          alt={row.original.name}
          className="object-cover size-10 rounded"
        />
      ) : (
        <span className="p-2 bg-muted rounded text-xs text-muted-foreground">
          No Image
        </span>
      ),
  },
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div className="font-medium flex items-center gap-2">
        {row.original.name}
      </div>
    ),
  },

  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => row.original.sku ?? "—",
  },

  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => (row.original.price ? `$${row.original.price}` : "—"),
  },

  {
    accessorKey: "cost",
    header: "Cost",
    cell: ({ row }) => (row.original.cost ? `$${row.original.cost}` : "—"),
  },

  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge className="bg-green-500">Active</Badge>
      ) : (
        <Badge variant="destructive">Inactive</Badge>
      ),
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ProductActions product={row.original} />,
  },
];
