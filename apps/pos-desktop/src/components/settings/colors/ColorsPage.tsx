import { useColors, useSeedColors } from "@/hooks/useColor";
import { useModalStore } from "@/store/modalStore";
import { ColorForm } from "@/components/settings/ColorForm";
import TitleBar from "@/components/title-bar";
import { Button, DataTable } from "@repo/ui";
import { getColorColumns } from "@/constants/columns/colorColumn";
import { toast } from "@repo/ui";

export default function ColorsPage() {
  const { data: colors = [], isLoading, refetch } = useColors();
  const { openModal } = useModalStore();
  const { mutate: seedColors, isPending: isSeeding } = useSeedColors();

  const handleAddColor = () => {
    openModal("Add Color", <ColorForm />);
  };

  const handleSeedColors = () => {
    seedColors(undefined, {
      onSuccess: () => {
        toast.success("Default colors generated successfully");
      },
      onError: () => {
        toast.error("Failed to generate default colors");
      },
    });
  };

  return (
    <div className="space-y-4">
      <TitleBar
        title="Colors"
        subtitle="Manage colors for categories and products"
      />
      <DataTable
        isLoading={isLoading}
        columns={getColorColumns()}
        data={colors}
        onRefetch={refetch}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSeedColors}
              isSubmitting={isSeeding}
              iconName="Sparkles"
            >
              Seed Colors
            </Button>
            <Button onClick={handleAddColor} iconName="Plus">
              Add Color
            </Button>
          </div>
        }
      />
    </div>
  );
}
