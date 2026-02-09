import { Button, Icon, Badge, cn, Skeleton } from "@repo/ui";
import type { FloorWithTableCount } from "@/dto/tables.dto";
import { useModalStore } from "@/store/modalStore";
import { FloorForm } from "./FloorForm";
import { useDeleteFloor } from "@/hooks/useFloor";
import { AlertDialog } from "../common";
import { Activity } from "react";
import { useAuthStore } from "@/store/authStore";

interface FloorTabsProps {
  floors: FloorWithTableCount[];
  selectedFloorId: string | null;
  onSelectFloor: (floorId: string | null) => void;
  onDeleteFloor?: (floor: FloorWithTableCount) => void;
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

  const deleteFloorMutation = useDeleteFloor();

  const handleAddFloor = () => openModal("Add New Floor", <FloorForm />);
  const handleEditFloor = (floor: FloorWithTableCount) =>
    openModal("Edit Floor", <FloorForm floor={floor} />);

  if (isLoading) {
    return (
      <div className="flex gap-3 items-center">
        <Skeleton className="h-12 w-28 bg-muted rounded-md" />
        <Skeleton className="h-12 w-32 bg-muted rounded-md" />
        <Skeleton className="h-12 w-28 bg-muted rounded-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* "All Tables" tab */}
      <Button
        variant={selectedFloorId === null ? "default" : "outline"}
        size="lg"
        onClick={() => onSelectFloor(null)}
        className={cn(
          "h-12 px-5 text-sm font-medium",
          selectedFloorId === null && "shadow-md ring-2 ring-primary/20",
        )}
      >
        <Icon name="LayoutGrid" className="h-5 w-5 mr-2" />
        All Tables
      </Button>

      {/* Floor tabs with integrated action bar */}
      {floors.map((floor) => (
        <div
          key={floor.id}
          className={cn(
            "relative flex items-center rounded-md border h-12",
            selectedFloorId === floor.id
              ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20"
              : "bg-background border-border hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {/* Main tab button */}
          <button
            onClick={() => onSelectFloor(floor.id)}
            className="flex items-center h-full px-5 text-sm font-medium flex-1"
          >
            <Icon name="Building2" className="h-5 w-5 mr-2" />
            {floor.name}
            <Badge
              variant="secondary"
              className="ml-2 h-6 min-w-6 text-xs px-2"
            >
              {floor._count?.tables || 0}
            </Badge>
          </button>

          {/* Divider */}
          <div
            className={cn(
              "h-8 w-px",
              selectedFloorId === floor.id
                ? "bg-primary-foreground/20"
                : "bg-border",
            )}
          />

          {/* Action buttons integrated in the tab */}
          <div
            className="flex items-center h-full px-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                selectedFloorId === floor.id
                  ? "hover:bg-primary-foreground/10 text-primary-foreground"
                  : "hover:bg-accent",
              )}
              onClick={() => handleEditFloor(floor)}
              aria-label={`Edit ${floor.name}`}
            >
              <Icon name="Pencil" className="h-3.5 w-3.5" />
            </Button>
            <div onClick={(e) => e.stopPropagation()}>
              <AlertDialog
                iconButton="Trash2"
                variant="delete"
                buttonVariant="ghost"
                className={cn(
                  "h-8 w-8",
                  selectedFloorId === floor.id
                    ? "hover:bg-primary-foreground/10 text-primary-foreground"
                    : "hover:bg-accent",
                )}
                title={`Delete Floor "${floor.name}"?`}
                description="Deleting this floor will unassign all tables associated with it. This action cannot be undone."
                onConfirm={() => deleteFloorMutation.mutate(floor.id)}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add Floor button */}
      <Activity mode={isHighLevelUser ? "visible" : "hidden"}>
        <Button
          variant="ghost"
          size="lg"
          onClick={handleAddFloor}
          className="h-12 px-5 border-dashed border-2"
        >
          <Icon name="Plus" className="h-5 w-5 mr-2" />
          Add Floor
        </Button>
      </Activity>
    </div>
  );
}
