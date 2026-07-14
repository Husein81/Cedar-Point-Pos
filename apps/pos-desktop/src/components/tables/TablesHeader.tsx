import { Button, Icon, Input, Select, cn } from "@repo/ui";
import { useTableUiStore } from "@/store/tableUiStore";
import type { FloorWithTableCount } from "@/dto/tables.dto";

interface TablesHeaderProps {
  floors: FloorWithTableCount[];
  unassignedCount: number;
  floorValue: string;
  occupancy: { inService: number; total: number };
  isConnected: boolean;
  isOnline: boolean;
  canManage: boolean;
  isEditing: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onAddTable: () => void;
  onManageFloors: () => void;
}

export function TablesHeader({
  floors,
  unassignedCount,
  floorValue,
  occupancy,
  isConnected,
  isOnline,
  canManage,
  isEditing,
  isRefreshing,
  onRefresh,
  onAddTable,
  onManageFloors,
}: TablesHeaderProps) {
  const view = useTableUiStore((s) => s.view);
  const setView = useTableUiStore((s) => s.setView);
  const search = useTableUiStore((s) => s.filters.search);
  const setSearch = useTableUiStore((s) => s.setSearch);
  const setActiveFloor = useTableUiStore((s) => s.setActiveFloor);
  const setEditingLayout = useTableUiStore((s) => s.setEditingLayout);

  const floorOptions = [
    ...(view === "grid" ? [{ value: "ALL", label: "All Floors" }] : []),
    ...floors.map((floor) => ({ value: floor.id, label: floor.name })),
    ...(unassignedCount > 0
      ? [{ value: "NONE", label: `No floor (${unassignedCount})` }]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Floor selector */}
      {floorOptions.length > 0 && (
        <Select
          options={floorOptions}
          value={floorValue}
          onChange={(option) => setActiveFloor(option.value)}
          placeholder="Floor"
        />
      )}

      {/* Search */}
      <div className="relative flex-1 sm:max-w-xs">
        <Icon
          name="Search"
          className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search table, server, order…"
          className="pl-8"
          aria-label="Search tables"
        />
      </div>

      {/* Live occupancy chip */}
      <div className="bg-card flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected
              ? "animate-pulse bg-emerald-500"
              : "bg-muted-foreground/50",
          )}
          title={
            isConnected ? "Live updates connected" : "Live updates offline"
          }
        />
        <Icon name="Users" className="text-muted-foreground h-4 w-4" />
        <span className="font-semibold tabular-nums">
          {occupancy.inService}/{occupancy.total}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* View toggle */}
        <div className="bg-muted flex items-center rounded-md border p-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            iconName="Map"
            aria-label="Floor plan view"
            aria-pressed={view === "canvas"}
            onClick={() => setView("canvas")}
            className={cn(
              view === "canvas" && "bg-background text-foreground shadow-sm",
            )}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            iconName="LayoutGrid"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className={cn(
              view === "grid" && "bg-background text-foreground shadow-sm",
            )}
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          iconName="RefreshCw"
          aria-label="Refresh tables"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(isRefreshing && "[&_svg]:animate-spin")}
        />

        {canManage && (
          <>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              iconName="PencilRuler"
              onClick={() => setEditingLayout(!isEditing)}
              disabled={!isOnline || view !== "canvas"}
            >
              Floor Editor
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="Layers"
              onClick={onManageFloors}
              disabled={!isOnline}
            >
              Floors
            </Button>
            <Button
              size="sm"
              iconName="Plus"
              onClick={onAddTable}
              disabled={!isOnline}
            >
              Add Table
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
