import { createFileRoute } from "@tanstack/react-router";
import { useColors } from "@/hooks/useColor";
import { useModalStore } from "@/store/modalStore";
import { ColorForm } from "@/components/settings/ColorForm";
import Heading from "@/components/heading";
import { Button, DataTable } from "@repo/ui";
import { getColorColumns } from "@/config/colorColumn";

export const Route = createFileRoute("/settings/colors")({
  component: ColorsSettingsPage,
  staticData: {
    breadcrumb: "Colors",
  },
});

function ColorsSettingsPage() {
  const { data: colors = [], isLoading, refetch } = useColors();
  const { openModal } = useModalStore();

  const handleAddColor = () => {
    openModal("Add Color", <ColorForm />);
  };

  return (
    <div className="space-y-4 pt-4">
      <Heading
        title="Colors"
        subtitle="Manage colors for categories and products"
      />
      <DataTable
        isLoading={isLoading}
        columns={getColorColumns()}
        data={colors}
        onRefetch={refetch}
        actions={
          <Button onClick={handleAddColor} iconName="Plus">
            Add Color
          </Button>
        }
      />
    </div>
  );
}
