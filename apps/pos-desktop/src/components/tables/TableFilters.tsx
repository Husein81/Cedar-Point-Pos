import { useState } from "react";
import { Input, Shad, Icon, Button } from "@repo/ui";
import type { TableStatus } from "@repo/types";

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

    const hasActiveFilters =
        filters.search ||
        filters.status !== "ALL" ||
        filters.floorId !== "ALL" ||
        filters.minCapacity ||
        filters.maxCapacity;

    return (
        <div className="flex flex-wrap gap-3 items-end">
            {/* Search Input */}
            <div className="flex-1 min-w-[200px] max-w-sm">
                <label
                    htmlFor="table-search"
                    className="block text-sm font-medium mb-1.5"
                >
                    Search
                </label>
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
            <div className="min-w-[150px]">
                <label
                    htmlFor="status-filter"
                    className="block text-sm font-medium mb-1.5"
                >
                    Status
                </label>
                <Shad.Select
                    value={localFilters.status}
                    onValueChange={handleStatusChange}
                >
                    <Shad.SelectTrigger id="status-filter">
                        <Shad.SelectValue placeholder="All Statuses" />
                    </Shad.SelectTrigger>
                    <Shad.SelectContent>
                        <Shad.SelectItem value="ALL">All Statuses</Shad.SelectItem>
                        <Shad.SelectItem value="AVAILABLE">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                Available
                            </div>
                        </Shad.SelectItem>
                        <Shad.SelectItem value="OCCUPIED">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                Occupied
                            </div>
                        </Shad.SelectItem>
                        <Shad.SelectItem value="RESERVED">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-amber-500" />
                                Reserved
                            </div>
                        </Shad.SelectItem>
                    </Shad.SelectContent>
                </Shad.Select>
            </div>

            {/* Floor Filter */}
            {floors.length > 0 && (
                <div className="min-w-[150px]">
                    <label
                        htmlFor="floor-filter"
                        className="block text-sm font-medium mb-1.5"
                    >
                        Floor
                    </label>
                    <Shad.Select
                        value={localFilters.floorId}
                        onValueChange={handleFloorChange}
                    >
                        <Shad.SelectTrigger id="floor-filter">
                            <Shad.SelectValue placeholder="All Floors" />
                        </Shad.SelectTrigger>
                        <Shad.SelectContent>
                            <Shad.SelectItem value="ALL">All Floors</Shad.SelectItem>
                            {floors.map((floor) => (
                                <Shad.SelectItem key={floor.id} value={floor.id}>
                                    <div className="flex items-center gap-2">
                                        <Icon name="Building2" className="h-4 w-4" />
                                        {floor.name}
                                    </div>
                                </Shad.SelectItem>
                            ))}
                        </Shad.SelectContent>
                    </Shad.Select>
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
