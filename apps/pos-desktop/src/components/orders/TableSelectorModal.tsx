import type { TableWithFloor } from "@/dto/tables.dto";
import { useFloorsByBranch } from "@/hooks/useFloor";
import { useTablesByBranch } from "@/hooks/useTable";
import { useModalStore } from "@/store/modalStore";
import { Badge, Button, Icon, Input, Shad, cn } from "@repo/ui";
import { useMemo, useState } from "react";
import { FILTER_OPTIONS, STATUS_CONFIG, StatusFilter } from "./config";

type TableSelectorModalProps = {
  onTableSelect: (table: TableWithFloor) => void;
  currentTableId?: string | null;
};

export function TableSelectorModal({
  onTableSelect,
  currentTableId,
}: TableSelectorModalProps) {
  const { closeModal } = useModalStore();
  const {
    data: tables,
    isLoading: isLoadingTables,
    error,
  } = useTablesByBranch();
  const { data: floors, isLoading: isLoadingFloors } = useFloorsByBranch();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedFloorId, setSelectedFloorId] = useState<string>("ALL");

  const filteredTables = useMemo(() => {
    if (!tables) return [];

    return tables.filter((table) => {
      const matchesSearch =
        searchQuery === "" ||
        table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        table.floor?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || table.status === statusFilter;

      const matchesFloor =
        selectedFloorId === "ALL" || table.floorId === selectedFloorId;

      return matchesSearch && matchesStatus && matchesFloor;
    });
  }, [tables, searchQuery, statusFilter, selectedFloorId]);

  const isLoading = isLoadingTables || isLoadingFloors;

  const tablesByFloor = useMemo(() => {
    const grouped: Record<string, TableWithFloor[]> = {};

    filteredTables.forEach((table) => {
      const floorName = table.floor?.name || "No Floor";
      if (!grouped[floorName]) grouped[floorName] = [];
      grouped[floorName].push(table);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === "No Floor") return 1;
      if (b === "No Floor") return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((floor) => ({ floor, tables: grouped[floor] || [] }));
  }, [filteredTables]);

  const handleSelect = (table: TableWithFloor) => {
    closeModal();
    onTableSelect(table);
  };

  const handleClearSelection = () => {
    onTableSelect({ id: "", name: "" } as TableWithFloor);
    closeModal();
  };

  return (
    <div className="px-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon name="Utensils" className="w-5 h-5 text-primary" />
        </div>
        <div>
          <Shad.DialogTitle className="text-lg font-semibold">
            Select Table
          </Shad.DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose a table for this order
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Icon
          name="Search"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        />
        <Input
          placeholder="Search tables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Floors */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Button
          variant={selectedFloorId === "ALL" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedFloorId("ALL")}
          className="h-8"
        >
          All Floors
        </Button>
        {floors?.map((floor) => (
          <Button
            key={floor.id}
            variant={selectedFloorId === floor.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFloorId(floor.id)}
            className="h-8"
          >
            {floor.name}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-4">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Tables Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Icon
            name="Loader2"
            className="w-6 h-6 animate-spin text-muted-foreground"
          />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <Icon
            name="AlertCircle"
            className="w-10 h-10 text-destructive mx-auto mb-2"
          />
          <p className="text-sm text-muted-foreground">Failed to load tables</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="text-center py-16">
          <Icon
            name="Search"
            className="w-10 h-10 text-muted-foreground mx-auto mb-2"
          />
          <p className="text-sm text-muted-foreground">No tables found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tablesByFloor.map(({ floor, tables: floorTables }) => (
            <div key={floor}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {floor}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {floorTables.map((table) => {
                  const config = STATUS_CONFIG[table.status];
                  const isSelected = table.id === currentTableId;

                  return (
                    <div
                      key={table.id}
                      onClick={() => handleSelect(table)}
                      className={cn(
                        "relative p-3 rounded-lg border-2 cursor-pointer transition-all text-center",
                        config.bgClass,
                        isSelected &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                    >
                      {/* Status Icon */}
                      <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center mx-auto mb-1.5">
                        <Icon
                          name={config.icon}
                          className={cn("w-4 h-4", config.color)}
                        />
                      </div>

                      {/* Table Name */}
                      <div className="font-semibold text-sm">{table.name}</div>

                      {/* Capacity */}
                      {table.capacity && (
                        <div className="text-xs text-muted-foreground">
                          {table.capacity} seats
                        </div>
                      )}

                      {/* Status Badge */}
                      <Badge
                        variant="outline"
                        className={cn("mt-1.5 text-xs", config.color)}
                      >
                        {config.label}
                      </Badge>

                      {/* Selected Check */}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Icon
                            name="Check"
                            className="w-3 h-3 text-primary-foreground"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t">
        {currentTableId ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          >
            <Icon name="X" className="w-4 h-4 mr-1" />
            Clear
          </Button>
        ) : (
          <div />
        )}
        <Button variant="outline" onClick={closeModal}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
