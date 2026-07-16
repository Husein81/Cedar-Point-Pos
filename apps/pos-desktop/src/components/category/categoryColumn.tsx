import { ColumnDef } from "@tanstack/react-table";
import type { Category } from "@repo/types";
import { Checkbox, cn } from "@repo/ui";
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
    accessorKey: "color",
    header: "Color",
    cell: ({ row }) =>
      row.original.color ? (
        <div className="flex items-center gap-2">
          <style
            dangerouslySetInnerHTML={{
              __html: `
            .category-color-${row.original.id} {
              background-color: ${row.original.color.hex};
            }
          `,
            }}
          />
          <div
            className={cn(
              "w-4 h-4 rounded-full border",
              `category-color-${row.original.id}`,
            )}
          />
          <span className="text-xs">{row.original.color.name}</span>
        </div>
      ) : (
        "—"
      ),
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
