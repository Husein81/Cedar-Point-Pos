import { Button, Empty, Icon } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { Activity, useCallback, useMemo, useState } from "react";

// Hooks
import { useFloorsByBranch } from "@/hooks/useFloor";
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
import { OngoingOrdersList } from "@/components/orders/OngoingOrdersList";

// Types
import type { TableFilters as TableFiltersType } from "@/components/tables/TableFilters";
import type { FloorWithTableCount, TableWithFloor } from "@/dto/tables.dto";
import { useModalStore } from "@/store/modalStore";
import { useAuthStore } from "@/store/authStore";

type ActiveView = "dine-in" | "orders";

export function TablesPage() {
  const { user, isHighLevelUser } = useAuthStore();
  const { branchId } = useBranchStore();
  const { openModal } = useModalStore();
  const navigate = useNavigate();

  // Redirect retail tenants away from tables page
  if (user?.tenant?.businessType === "RETAIL") {
    navigate({ to: "/orders" });
  }

  // Data fetching
  const {
    data: tables = [],
    isLoading: isLoadingTables,
    refetch: refetchTables,
  } = useTablesByBranch();
  const { data: floors = [], isLoading: isLoadingFloors } = useFloorsByBranch();
  const { data: stats } = useTableStats();

  // UI State
  const [activeView, setActiveView] = useState<ActiveView>("dine-in");
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div className="flex items-center gap-1 bg-muted/40 p-1 w-fit rounded-lg border">
          <Button
            variant={activeView === "dine-in" ? "secondary" : "ghost"}
            size="sm"
            className={
              activeView === "dine-in"
                ? "rounded-md shadow-sm bg-background hover:bg-background text-foreground"
                : "rounded-md hover:bg-background hover:text-foreground text-muted-foreground"
            }
            onClick={() => setActiveView("dine-in")}
          >
            Dine In
          </Button>
          <Button
            variant={activeView === "orders" ? "secondary" : "ghost"}
            size="sm"
            className={
              activeView === "orders"
                ? "rounded-md shadow-sm bg-background hover:bg-background text-foreground"
                : "rounded-md hover:bg-background hover:text-foreground text-muted-foreground"
            }
            onClick={() => setActiveView("orders")}
          >
            Orders
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() =>
              navigate({
                to: "/orders",
                search: { orderType: "dine_in" },
              })
            }
          >
            <Icon name="Plus" className="h-4 w-4 mr-2" />
            New Order
          </Button>
          {activeView === "dine-in" && (
            <Activity mode={isHighLevelUser ? "visible" : "hidden"}>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchTables()}
                >
                  <Icon name="RefreshCw" className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button size="sm" variant="outline" onClick={handleAddTable}>
                  <Icon name="Plus" className="h-4 w-4 mr-2" />
                  Add Table
                </Button>
              </div>
            </Activity>
          )}
        </div>
      </div>

      {activeView === "dine-in" ? (
        <>
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
        </>
      ) : (
        /* Orders Tab Content */
        <OngoingOrdersList />
      )}

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
                <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Shad.AlertDialogAction>
          </Shad.AlertDialogFooter>
        </Shad.AlertDialogContent>
      </Shad.AlertDialog> */}
    </div>
  );
}
