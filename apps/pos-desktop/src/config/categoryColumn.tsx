import { ColumnDef } from "@tanstack/react-table";
import type { Category } from "@repo/types";
import { Checkbox } from "@repo/ui";
import { CategoryActions } from "@/components/category/CategoryActions";

export const getCategoryColumns = (): ColumnDef<Category>[] => [
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
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <div className="text-gray-600 dark:text-gray-400">
        {row.original.code || "—"}
      </div>
    ),
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
    cell: ({ row }) => <CategoryActions category={row.original} />,
  },
];
