import { TableStatus } from "@repo/types";
import { Button, Icon, Input, Select } from "@repo/ui";
import { useMemo } from "react";
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
  const handleSearchChange = (value: string) =>
    onFiltersChange({ ...filters, search: value });

  const handleStatusChange = (value: string) =>
    onFiltersChange({ ...filters, status: value as TableStatus | "ALL" });

  const handleFloorChange = (value: string) =>
    onFiltersChange({ ...filters, floorId: value });

  const handleClearFilters = () =>
    onFiltersChange({ search: "", status: "ALL", floorId: "ALL" });

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
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search Input */}
      <div className="flex-1 min-w-44 max-w-sm">
        <div className="relative">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            id="table-search"
            placeholder="Search tables..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="min-w-40">
        <Select
          placeholder="All Statuses"
          value={filters.status}
          onChange={(opt) => handleStatusChange(opt.value)}
          options={[
            { label: "All Statuses", value: "ALL" },
            ...TABLE_STATUS_OPTIONS,
          ]}
        />
      </div>

      {/* Floor Filter */}
      {floors.length > 0 && (
        <div className="min-w-40">
          <Select
            value={filters.floorId}
            placeholder="All Floors"
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
          className="h-10"
        >
          <Icon name="X" className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}
