import { Button, Empty, Icon } from "@repo/ui";
import { useCallback, useMemo, useState } from "react";

// Hooks
import { useDeleteFloor, useFloorsByBranch } from "@/hooks/useFloor";
import { useTablesByBranch, useTableStats } from "@/hooks/useTable";
import { useBranchStore } from "@/store/branchStore";

// Components
import {
  FloorTabs,
  TableFilters,
  TableForm,
  TableGrid,
  TablesStatsCards,
} from "@/components/tables";

// Types
import type { TableFilters as TableFiltersType } from "@/components/tables/TableFilters";
import type { FloorWithTableCount, TableWithFloor } from "@/dto/tables.dto";
import { useModalStore } from "@/store/modalStore";
import Heading from "../heading";

export function TablesPage() {
  const { branchId } = useBranchStore();
  const { openModal } = useModalStore();

  // Data fetching
  const {
    data: tables = [],
    isLoading: isLoadingTables,
    refetch: refetchTables,
  } = useTablesByBranch();
  const { data: floors = [], isLoading: isLoadingFloors } = useFloorsByBranch();
  const { data: stats } = useTableStats();

  // UI State
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "table" | "floor";
    item: TableWithFloor | FloorWithTableCount;
  } | null>(null);
  const [filters, setFilters] = useState<TableFiltersType>({
    search: "",
    status: "ALL",
    floorId: "ALL",
  });

  // Filter tables by floor, status, and search
  const filteredTables = useMemo(() => {
    let result = tables;

    // Filter by selected floor tab
    if (selectedFloorId !== null) {
      result = result.filter((table) => table.floorId === selectedFloorId);
    }

    // Filter by search query
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (table) =>
          table.name.toLowerCase().includes(search) ||
          table.tableNumber.toString().includes(search),
      );
    }

    // Filter by status
    if (filters.status !== "ALL") {
      result = result.filter(
        (table) => table.status === (filters.status as string),
      );
    }

    // Filter by floor filter (different from floor tab selection)
    if (filters.floorId !== "ALL") {
      result = result.filter((table) => table.floorId === filters.floorId);
    }

    return result;
  }, [tables, selectedFloorId, filters]);

  // No branch selected
  if (!branchId) {
    return (
      <Empty
        title="No Branch Selected"
        description="Please select a branch from the sidebar to manage tables."
        icon="Building2"
      />
    );
  }

  // Delete handlers
  const handleDeleteClick = (
    type: "table" | "floor",
    item: TableWithFloor | FloorWithTableCount,
  ) => {
    setDeleteTarget({ type, item });
    setIsDeleteModalOpen(true);
  };

  const handleAddTable = () => {
    openModal("Add Table", <TableForm />);
  };

  const handleDeleteFloor = useCallback(
    (floor: FloorWithTableCount) => handleDeleteClick("floor", floor),
    [],
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Heading
        title="Tables"
        subtitle="Manage your restaurant tables and floor layouts"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchTables()}>
              <Icon name="RefreshCw" className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleAddTable}>
              <Icon name="Plus" className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <TablesStatsCards stats={stats} />

      {/* Floor Tabs */}
      <FloorTabs
        floors={floors}
        selectedFloorId={selectedFloorId}
        onSelectFloor={setSelectedFloorId}
        onDeleteFloor={handleDeleteFloor}
        isLoading={isLoadingFloors}
      />

      {/* Filters */}
      <TableFilters
        filters={filters}
        onFiltersChange={setFilters}
        floors={floors.map((f) => ({ id: f.id, name: f.name }))}
      />

      {/* Table Grid */}
      <TableGrid tables={filteredTables} isLoading={isLoadingTables} />

      {/* Delete Confirmation Dialog */}
      {/* <Shad.AlertDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
      >
        <Shad.AlertDialogContent>
          <Shad.AlertDialogHeader>
            <Shad.AlertDialogTitle>
              Delete {deleteTarget?.type === "table" ? "Table" : "Floor"}?
            </Shad.AlertDialogTitle>
            <Shad.AlertDialogDescription>
              {deleteTarget?.type === "table" ? (
                <>
                  This will remove table "
                  {(deleteTarget?.item as TableWithFloor)?.name}" from your
                  restaurant layout. This action cannot be undone.
                </>
              ) : (
                <>
                  This will delete floor "
                  {(deleteTarget?.item as FloorWithTableCount)?.name}". All
                  tables on this floor will be unassigned but not deleted. This
                  action cannot be undone.
                </>
              )}
            </Shad.AlertDialogDescription>
          </Shad.AlertDialogHeader>
          <Shad.AlertDialogFooter>
            <Shad.AlertDialogCancel disabled={isDeletePending}>
              Cancel
            </Shad.AlertDialogCancel>
            <Shad.AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeletePending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {isDeletePending && (
                <Icon name="LoaderCircle" className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Shad.AlertDialogAction>
          </Shad.AlertDialogFooter>
        </Shad.AlertDialogContent>
      </Shad.AlertDialog> */}
    </div>
  );
}
