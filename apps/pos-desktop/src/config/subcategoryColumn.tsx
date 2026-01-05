import { ColumnDef } from "@tanstack/react-table";
import type { Subcategory } from "@repo/types";
import { Checkbox } from "@repo/ui";
import { SubcategoryActions } from "@/components/category/SubcategoryActions";

export const getSubcategoryColumns = (
  categoryId: string
): ColumnDef<Subcategory>[] => [
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
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
        {row.original.description || "—"}
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <SubcategoryActions subcategory={row.original} categoryId={categoryId} />
    ),
  },
];
