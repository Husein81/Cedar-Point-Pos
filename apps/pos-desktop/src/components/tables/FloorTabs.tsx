import type { FloorWithTableCount } from "@/dto/tables.dto";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import { Button, Icon, Skeleton } from "@repo/ui";
import { FloorTab } from "./FloorTab";
import { FloorManagementModal } from "./FloorManagementModal";

interface FloorTabsProps {
  floors: FloorWithTableCount[];
  selectedFloorId: string | null;
  onSelectFloor: (floorId: string | null) => void;
  isLoading?: boolean;
}

export function FloorTabs({
  floors,
  selectedFloorId,
  onSelectFloor,
  isLoading,
}: FloorTabsProps) {
  const { isHighLevelUser } = useAuthStore();
  const { openModal } = useModalStore();

  const handleManageFloors = () => {
    openModal("Manage Floors", <FloorManagementModal />);
  };

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28 rounded-md bg-muted/85" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3">
      <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
        <FloorTab
          active={selectedFloorId === null}
          label="All Tables"
          onClick={() => onSelectFloor(null)}
        />

        {/* FLOORS */}
        {floors.map((floor) => {
          const active = selectedFloorId === floor.id;

          return (
            <FloorTab
              key={floor.id}
              active={active}
              label={floor.name}
              badge={floor._count?.tables}
              onClick={() => onSelectFloor(floor.id)}
            />
          );
        })}
      </div>

      {isHighLevelUser && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleManageFloors}
          className="whitespace-nowrap"
        >
          <Icon name="Settings2" className="w-4 h-4 mr-2" />
          Manage Floors
        </Button>
      )}
    </div>
  );
}
