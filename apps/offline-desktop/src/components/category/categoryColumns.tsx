import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@repo/ui";
import type { Category } from "@/shared/models";

type Handlers = {
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

export const getCategoryColumns = ({
  onEdit,
  onDelete,
}: Handlers): ColumnDef<Category>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "sortOrder",
    header: "Sort Order",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex gap-1">
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
