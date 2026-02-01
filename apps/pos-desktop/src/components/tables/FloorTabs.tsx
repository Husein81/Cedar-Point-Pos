import { Button, Icon, Shad, Badge, cn } from "@repo/ui";
import type { FloorWithTableCount } from "@/dto/tables.dto";

interface FloorTabsProps {
    floors: FloorWithTableCount[];
    selectedFloorId: string | null;
    onSelectFloor: (floorId: string | null) => void;
    onAddFloor?: () => void;
    onEditFloor?: (floor: FloorWithTableCount) => void;
    onDeleteFloor?: (floor: FloorWithTableCount) => void;
    isLoading?: boolean;
}

export function FloorTabs({
    floors,
    selectedFloorId,
    onSelectFloor,
    onAddFloor,
    onEditFloor,
    onDeleteFloor,
    isLoading,
}: FloorTabsProps) {
    if (isLoading) {
        return (
            <div className="flex gap-2 items-center">
                <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
                <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
                <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
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
                className={cn(
                    "h-9",
                    selectedFloorId === null && "shadow-md"
                )}
            >
                <Icon name="LayoutGrid" className="h-4 w-4 mr-2" />
                All Tables
            </Button>

            {/* Floor tabs */}
            {floors.map((floor) => (
                <div
                    key={floor.id}
                    className="group relative"
                    onDoubleClick={() => onEditFloor?.(floor)}
                    title="Double-click to edit floor"
                >
                    <Button
                        variant={selectedFloorId === floor.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSelectFloor(floor.id)}
                        className={cn(
                            "h-9 pr-8",
                            selectedFloorId === floor.id && "shadow-md"
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
                        <Shad.DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Icon name="EllipsisVertical" className="h-3 w-3" />
                            </Button>
                        </Shad.DropdownMenuTrigger>
                        <Shad.DropdownMenuContent align="end">
                            <Shad.DropdownMenuItem onClick={() => onEditFloor?.(floor)}>
                                <Icon name="Pencil" className="mr-2 h-4 w-4" />
                                Edit Floor
                            </Shad.DropdownMenuItem>
                            <Shad.DropdownMenuItem
                                onClick={() => onDeleteFloor?.(floor)}
                                className="text-red-600 dark:text-red-400"
                            >
                                <Icon name="Trash2" className="mr-2 h-4 w-4" />
                                Delete Floor
                            </Shad.DropdownMenuItem>
                        </Shad.DropdownMenuContent>
                    </Shad.DropdownMenu>
                </div>
            ))}

            {/* Add Floor button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onAddFloor}
                className="h-9 border-dashed border-2"
            >
                <Icon name="Plus" className="h-4 w-4 mr-2" />
                Add Floor
            </Button>
        </div>
    );
}
