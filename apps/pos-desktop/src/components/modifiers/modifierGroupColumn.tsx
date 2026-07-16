import { ColumnDef } from "@tanstack/react-table";
import { ModifierGroupItem } from "@/types/modifiers";
import { Checkbox, Badge } from "@repo/ui";
import { ModifierGroupActions } from "@/components/modifiers/ModifierGroupActions";

export const getModifierGroupColumns = (): ColumnDef<ModifierGroupItem>[] => [
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
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const isSingle = row.original.type === "SINGLE";
      return (
        <Badge
          variant={isSingle ? "default" : "secondary"}
          className={
            isSingle
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
          }
        >
          {isSingle ? "Single Choice" : "Multiple Choice"}
        </Badge>
      );
    },
  },
  {
    id: "modifierCount",
    header: "Modifiers",
    cell: ({ row }) => {
      const count = row.original.modifiers?.length || 0;
      return (
        <div className="text-gray-600 dark:text-gray-400">
          {count} modifier{count !== 1 ? "s" : ""}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ModifierGroupActions group={row.original} />,
  },
];
