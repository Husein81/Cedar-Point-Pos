import { TableStatus } from "@repo/types";
import { Button, Icon, Input, Label, Select } from "@repo/ui";
import { useMemo, useState } from "react";
import { TABLE_STATUS_OPTIONS } from "./config";

export interface TableFilters {
  search: string;
  status: TableStatus | "ALL";
  floorId: string | "ALL";
  minCapacity?: number;
  maxCapacity?: number;
}

interface TableFiltersProps {
  filters: TableFilters;
  onFiltersChange: (filters: TableFilters) => void;
  floors: Array<{ id: string; name: string }>;
}

export function TableFilters({
  filters,
  onFiltersChange,
  floors,
}: TableFiltersProps) {
  const [localFilters, setLocalFilters] = useState<TableFilters>(filters);

  const handleSearchChange = (value: string) => {
    const updated = { ...localFilters, search: value };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleStatusChange = (value: string) => {
    const updated = {
      ...localFilters,
      status: value as TableStatus | "ALL",
    };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleFloorChange = (value: string) => {
    const updated = { ...localFilters, floorId: value };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleClearFilters = () => {
    const cleared: TableFilters = {
      search: "",
      status: "ALL",
      floorId: "ALL",
    };
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const floorOptions = useMemo(
    () => [
      { label: "All Floors", value: "ALL" },
      ...floors.map((floor) => ({
        label: floor.name,
        value: floor.id,
      })),
    ],
    [floors],
  );

  const hasActiveFilters =
    filters.search ||
    filters.status !== "ALL" ||
    filters.floorId !== "ALL" ||
    filters.minCapacity ||
    filters.maxCapacity;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Search Input */}
      <div className="flex-1 min-w-37 max-w-sm">
        <Label
          htmlFor="table-search"
          className="block text-sm font-medium mb-1.5"
        >
          Search
        </Label>
        <div className="relative">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            id="table-search"
            placeholder="Search by name or number..."
            value={localFilters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="min-w-37">
        <Label
          htmlFor="status-filter"
          className="block text-sm font-medium mb-1.5"
        >
          Status
        </Label>
        <Select
          placeholder="All Statuses"
          value={localFilters.status}
          onChange={(opt) => handleStatusChange(opt.value)}
          options={[
            { label: "All Statuses", value: "ALL" },
            ...TABLE_STATUS_OPTIONS,
          ]}
        />
      </div>

      {/* Floor Filter */}
      {floors.length > 0 && (
        <div className="min-w-37">
          <Label
            htmlFor="floor-filter"
            className="block text-sm font-medium mb-1.5"
          >
            Floor
          </Label>
          <Select
            value={localFilters.floorId}
            placeholder="All floors"
            onChange={(opt) => handleFloorChange(opt.value)}
            options={floorOptions}
          />
        </div>
      )}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-9"
        >
          <Icon name="X" className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
