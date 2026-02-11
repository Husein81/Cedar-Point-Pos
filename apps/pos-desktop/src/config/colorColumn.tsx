import { Color } from "@repo/types";
import { ColumnDef } from "@tanstack/react-table";
import { ColorForm } from "@/components/settings/ColorForm";
import { useModalStore } from "@/store/modalStore";
import { useDeleteColor } from "@/hooks/useColor";
import { Button } from "@repo/ui";
import { Pencil, Trash2 } from "lucide-react";

export const getColorColumns = (): ColumnDef<Color>[] => {
  const openModal = useModalStore((state) => state.openModal);
  const deleteMutation = useDeleteColor();

  return [
    {
      accessorKey: "hex",
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
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const color = row.original;

        const handleEdit = () => {
          openModal("Edit Color", <ColorForm color={color} />);
        };

        const handleDelete = () => {
          if (confirm("Are you sure you want to delete this color?")) {
            deleteMutation.mutate(color.id);
          }
        };

        return (
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ];
};
