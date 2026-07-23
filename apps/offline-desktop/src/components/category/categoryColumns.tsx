import type { ColumnDef } from "@tanstack/react-table";
import { Badge, Button } from "@repo/ui";
import type { Category } from "@/shared/models";

type Handlers = {
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onManageSubcategories: (category: Category) => void;
};

export const getCategoryColumns = ({
  onEdit,
  onDelete,
  onManageSubcategories,
}: Handlers): ColumnDef<Category>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: "subcategories",
    header: "Subcategories",
    cell: ({ row }) => {
      const count = row.original.subcategories.length;
      return count > 0 ? (
        <Badge variant="secondary">{count}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
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
          iconName="Layers"
          onClick={() => onManageSubcategories(row.original)}
        />
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
