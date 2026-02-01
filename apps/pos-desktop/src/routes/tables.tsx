import { useState, useMemo, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shad, Icon } from "@repo/ui";

// Hooks
import {
  useTablesByBranch,
  useTableStats,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
} from "@/hooks/useTable";
import {
  useFloorsByBranch,
  useCreateFloor,
  useUpdateFloor,
  useDeleteFloor,
} from "@/hooks/useFloor";
import { useBranchStore } from "@/store/branchStore";

// Components
import {
  TableGrid,
  FloorTabs,
  TableForm,
  FloorForm,
  TableFilters,
  TablesPageHeader,
  TablesStatsCards,
} from "@/components/tables";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Types
import type {
  TableWithFloor,
  FloorWithTableCount
  ,
  CreateTableDto,
  UpdateTableDto,
  CreateFloorDto,
  UpdateFloorDto,
} from "@/dto/tables.dto";
import type { TableFilters as TableFiltersType } from "@/components/tables/TableFilters";

export const Route = createFileRoute("/tables")({
  component: TablesPage,
});

function TablesPage() {
  const { branchId } = useBranchStore();

  // Data fetching
  const {
    data: tables = [],
    isLoading: isLoadingTables,
    refetch: refetchTables,
  } = useTablesByBranch();
  const { data: floors = [], isLoading: isLoadingFloors } = useFloorsByBranch();
  const { data: stats } = useTableStats();

  // Mutations
  const createTableMutation = useCreateTable();
  const updateTableMutation = useUpdateTable();
  const deleteTableMutation = useDeleteTable();
  const createFloorMutation = useCreateFloor();
  const updateFloorMutation = useUpdateFloor();
  const deleteFloorMutation = useDeleteFloor();

  // UI State
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableWithFloor | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<FloorWithTableCount | null>(null);
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
          table.tableNumber.toString().includes(search)
      );
    }

    // Filter by status
    if (filters.status !== "ALL") {
      result = result.filter((table) => table.status === filters.status as string);
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
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Icon name="Building2" className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No Branch Selected</h2>
        <p className="text-muted-foreground max-w-sm">
          Please select a branch from the sidebar to manage tables.
        </p>
      </div>
    );
  }

  // Table handlers
  const handleOpenTableModal = useCallback((table?: TableWithFloor) => {
    setSelectedTable(table || null);
    setIsTableModalOpen(true);
  }, []);

  const handleCloseTableModal = useCallback(() => {
    setSelectedTable(null);
    setIsTableModalOpen(false);
  }, []);

  const handleTableSubmit = useCallback((data: CreateTableDto | UpdateTableDto) => {
    if (selectedTable) {
      updateTableMutation.mutate(
        { id: selectedTable.id, data: data as UpdateTableDto },
        {
          onSuccess: () => {
            setSelectedTable(null);
            setIsTableModalOpen(false);
          },
        }
      );
    } else {
      createTableMutation.mutate(data as CreateTableDto, {
        onSuccess: () => {
          setSelectedTable(null);
          setIsTableModalOpen(false);
        },
      });
    }
  }, [selectedTable, updateTableMutation, createTableMutation]);

  // Floor handlers
  const handleOpenFloorModal = useCallback((floor?: FloorWithTableCount) => {
    setSelectedFloor(floor || null);
    setIsFloorModalOpen(true);
  }, []);

  const handleCloseFloorModal = useCallback(() => {
    setSelectedFloor(null);
    setIsFloorModalOpen(false);
  }, []);

  const handleFloorSubmit = useCallback((data: CreateFloorDto | UpdateFloorDto) => {
    if (selectedFloor) {
      updateFloorMutation.mutate(
        { id: selectedFloor.id, data: data as UpdateFloorDto },
        {
          onSuccess: () => {
            setSelectedFloor(null);
            setIsFloorModalOpen(false);
          },
        }
      );
    } else {
      createFloorMutation.mutate(data as CreateFloorDto, {
        onSuccess: () => {
          setSelectedFloor(null);
          setIsFloorModalOpen(false);
        },
      });
    }
  }, [selectedFloor, updateFloorMutation, createFloorMutation]);

  // Delete handlers
  const handleDeleteClick = useCallback((
    type: "table" | "floor",
    item: TableWithFloor | FloorWithTableCount
  ) => {
    setDeleteTarget({ type, item });
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "table") {
      deleteTableMutation.mutate(deleteTarget.item.id, {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        },
      });
    } else {
      deleteFloorMutation.mutate(deleteTarget.item.id, {
        onSuccess: () => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
          // Reset filter if deleted floor was selected
          if (selectedFloorId === deleteTarget.item.id) {
            setSelectedFloorId(null);
          }
        },
      });
    }
  }, [deleteTarget, deleteTableMutation, deleteFloorMutation, selectedFloorId]);

  const isDeletePending =
    deleteTableMutation.isPending || deleteFloorMutation.isPending;

  // Memoized handlers for component props (avoid inline functions)
  const handleAddTable = useCallback(() => handleOpenTableModal(), []);
  const handleAddFloor = useCallback(() => handleOpenFloorModal(), []);
  const handleEditTable = useCallback((table: TableWithFloor) => handleOpenTableModal(table), []);
  const handleEditFloor = useCallback((floor: FloorWithTableCount) => handleOpenFloorModal(floor), []);
  const handleDeleteTable = useCallback((table: TableWithFloor) => handleDeleteClick("table", table), []);
  const handleDeleteFloor = useCallback((floor: FloorWithTableCount) => handleDeleteClick("floor", floor), []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <TablesPageHeader
        onRefresh={refetchTables}
        onAddTable={handleAddTable}
      />

      {/* Stats Cards */}
      <TablesStatsCards stats={stats} />

      {/* Floor Tabs */}
      <FloorTabs
        floors={floors}
        selectedFloorId={selectedFloorId}
        onSelectFloor={setSelectedFloorId}
        onAddFloor={handleAddFloor}
        onEditFloor={handleEditFloor}
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
      <ErrorBoundary>
        <TableGrid
          tables={filteredTables}
          onEditTable={handleEditTable}
          onDeleteTable={handleDeleteTable}
          isLoading={isLoadingTables}
        />
      </ErrorBoundary>

      {/* Table Form Dialog */}
      <Shad.Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
        <Shad.DialogContent className="sm:max-w-[480px]">
          <Shad.DialogHeader>
            <Shad.DialogTitle>
              {selectedTable ? "Edit Table" : "Add New Table"}
            </Shad.DialogTitle>
            <Shad.DialogDescription>
              {selectedTable
                ? "Update the table details below."
                : "Fill in the details for your new table."}
            </Shad.DialogDescription>
          </Shad.DialogHeader>
          <TableForm
            table={selectedTable}
            onSubmit={handleTableSubmit}
            onCancel={handleCloseTableModal}
            isSubmitting={
              createTableMutation.isPending || updateTableMutation.isPending
            }
          />
        </Shad.DialogContent>
      </Shad.Dialog>

      {/* Floor Form Dialog */}
      <Shad.Dialog open={isFloorModalOpen} onOpenChange={setIsFloorModalOpen}>
        <Shad.DialogContent className="sm:max-w-[400px]">
          <Shad.DialogHeader>
            <Shad.DialogTitle>
              {selectedFloor ? "Edit Floor" : "Add New Floor"}
            </Shad.DialogTitle>
            <Shad.DialogDescription>
              {selectedFloor
                ? "Update floor details or delete the floor"
                : "Create a new floor to organize your tables."}
            </Shad.DialogDescription>
          </Shad.DialogHeader>
          <FloorForm
            floor={selectedFloor}
            onSubmit={handleFloorSubmit}
            onCancel={handleCloseFloorModal}
            onDelete={
              selectedFloor
                ? () => {
                  handleCloseFloorModal();
                  handleDeleteClick("floor", selectedFloor);
                }
                : undefined
            }
            isSubmitting={
              createFloorMutation.isPending || updateFloorMutation.isPending
            }
          />
        </Shad.DialogContent>
      </Shad.Dialog>

      {/* Delete Confirmation Dialog */}
      <Shad.AlertDialog
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
                  {(deleteTarget?.item as FloorWithTableCount)?.name}". All tables
                  on this floor will be unassigned but not deleted. This action
                  cannot be undone.
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
                <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Shad.AlertDialogAction>
          </Shad.AlertDialogFooter>
        </Shad.AlertDialogContent>
      </Shad.AlertDialog>
    </div>
  );
}
