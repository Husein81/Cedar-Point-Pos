import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@repo/ui";
import type { Color } from "@/shared/models";

type Handlers = {
  onEdit: (color: Color) => void;
  onDelete: (color: Color) => void;
};

export const getColorColumns = ({
  onEdit,
  onDelete,
}: Handlers): ColumnDef<Color>[] => [
  {
    id: "swatch",
    header: "Color",
    cell: ({ row }) => (
      <div
        className="w-4 h-4 rounded-full border"
        style={{ backgroundColor: row.original.hex }}
      />
    ),
  },
  {
    accessorKey: "hex",
    header: "Hex Code",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.hex}</span>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
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
