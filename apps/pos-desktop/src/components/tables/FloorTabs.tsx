import { Button, Icon, Shad, Badge, cn, Skeleton } from "@repo/ui";
import type { FloorWithTableCount } from "@/dto/tables.dto";
import { useModalStore } from "@/store/modalStore";
import { FloorForm } from "./FloorForm";
import { useDeleteFloor } from "@/hooks/useFloor";
import { AlertDialog } from "../common";

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
  const { openModal } = useModalStore();

  const deleteFloorMutation = useDeleteFloor();

  const handleAddFloor = () => openModal("Add New Floor", <FloorForm />);
  const handleEditFloor = (floor: FloorWithTableCount) =>
    openModal("Edit Floor", <FloorForm floor={floor} />);

  if (isLoading) {
    return (
      <div className="flex gap-2 items-center">
        <Skeleton className="h-9 w-20 bg-muted rounded-md" />
        <Skeleton className="h-9 w-24 bg-muted rounded-md" />
        <Skeleton className="h-9 w-20 bg-muted rounded-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* "All Tables" tab */}
      <Button
        variant={selectedFloorId === null ? "default" : "outline"}
        size="sm"
        onClick={() => onSelectFloor(null)}
        className={cn("h-9", selectedFloorId === null && "shadow-md")}
      >
        <Icon name="LayoutGrid" className="h-4 w-4 mr-2" />
        All Tables
      </Button>

      {/* Floor tabs */}
      {floors.map((floor) => (
        <div
          key={floor.id}
          className="group relative"
          onDoubleClick={() => handleEditFloor(floor)}
          title="Double-click to edit floor"
        >
          <Button
            variant={selectedFloorId === floor.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectFloor(floor.id)}
            className={cn(
              "h-9 pr-8",
              selectedFloorId === floor.id && "shadow-md",
            )}
          >
            <Icon name="Building2" className="h-4 w-4 mr-2" />
            {floor.name}
            <Badge
              variant="secondary"
              className="ml-2 h-5 min-w-5 text-xs px-1.5"
            >
              {floor._count?.tables || 0}
            </Badge>
          </Button>

          {/* Dropdown for edit/delete */}
          <Shad.DropdownMenu>
            <Shad.DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icon name="EllipsisVertical" className="h-3 w-3" />
              </Button>
            </Shad.DropdownMenuTrigger>
            <Shad.DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <Shad.DropdownMenuItem onClick={() => handleEditFloor(floor)}>
                <Icon name="Pencil" className="mr-2 h-4 w-4" />
                Edit Floor
              </Shad.DropdownMenuItem>
              <AlertDialog
                iconButton="Trash2"
                variant="delete"
                buttonVariant="ghost"
                size={"sm"}
                className="hover:bg-destructive font-light"
                label="Delete Floor"
                title={`Delete Floor "${floor.name}"?`}
                description="Deleting this floor will unassign all tables associated with it. This action cannot be undone."
                onConfirm={() => deleteFloorMutation.mutate(floor.id)}
              />
            </Shad.DropdownMenuContent>
          </Shad.DropdownMenu>
        </div>
      ))}

      {/* Add Floor button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddFloor}
        className="h-9 border-dashed border-2"
      >
        <Icon name="Plus" className="h-4 w-4 mr-2" />
        Add Floor
      </Button>
    </div>
  );
}
