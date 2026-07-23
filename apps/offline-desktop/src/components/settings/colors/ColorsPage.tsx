import { useState } from "react";
import { Button, DataTable, Icon } from "@repo/ui";
import TitleBar from "@/components/title-bar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useColors, useDeleteColor, useSeedColors } from "@/hooks/useColor";
import { ColorFormModal } from "./ColorFormModal";
import { getColorColumns } from "./colorColumns";
import type { Color } from "@/shared/models";

export default function ColorsPage() {
  const { data: colors, isLoading, refetch } = useColors();
  const deleteColor = useDeleteColor();
  const seedColors = useSeedColors();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Color | null>(null);
  const [deleting, setDeleting] = useState<Color | null>(null);

  const columns = getColorColumns({
    onEdit: (color) => {
      setEditing(color);
      setIsFormOpen(true);
    },
    onDelete: (color) => setDeleting(color),
  });

  return (
    <div className="space-y-6 p-4">
      <TitleBar
        title="Colors"
        subtitle="Manage colors for categories and products"
      />

      <DataTable
        columns={columns}
        data={colors ?? []}
        isLoading={isLoading}
        onRefetch={refetch}
        search={{ keys: ["name", "hex"] }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => seedColors.mutate()}
              isSubmitting={seedColors.isPending}
              disabled={seedColors.isPending}
            >
              <Icon name="Sparkles" className="w-4 h-4" />
              Seed Colors
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
            >
              <Icon name="Plus" className="w-4 h-4" />
              Add Color
            </Button>
          </div>
        }
      />

      <ColorFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        color={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete color?"
        description={`"${deleting?.name}" will be removed from the palette.`}
        isPending={deleteColor.isPending}
        onConfirm={async () => {
          if (deleting) await deleteColor.mutateAsync(deleting.id);
        }}
      />
    </div>
  );
}
