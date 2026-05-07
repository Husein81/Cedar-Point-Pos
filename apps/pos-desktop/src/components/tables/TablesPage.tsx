import { Button, Empty, Icon } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { Activity, useMemo, useState } from "react";

// Hooks
import { useFloorsByBranch } from "@/hooks/useFloor";
import { useTablesByBranch } from "@/hooks/useTable";
import { useBranchStore } from "@/store/branchStore";

// Components
import { OngoingOrdersList } from "@/components/orders/OngoingOrdersList";
import {
  FloorTabs,
  TableFilters,
  TableForm,
  TableGrid,
} from "@/components/tables";

// Types
import type { TableFilters as TableFiltersType } from "@/components/tables/TableFilters";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";

type ActiveView = "dine-in" | "orders";

export function TablesPage() {
  const { isHighLevelUser } = useAuthStore();
  const { branchId } = useBranchStore();
  const { openModal } = useModalStore();
  const navigate = useNavigate();

  // Data fetching
  const {
    data: tables = [],
    isLoading: isLoadingTables,
    refetch: refetchTables,
  } = useTablesByBranch();
  const { data: floors = [], isLoading: isLoadingFloors } = useFloorsByBranch();

  // UI State
  const [activeView, setActiveView] = useState<ActiveView>("dine-in");
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TableFiltersType>({
    search: "",
    status: "ALL",
    floorId: "ALL",
  });

  // Selecting a floor tab resets the floor dropdown filter to avoid conflicts
  const handleSelectFloor = (floorId: string | null) => {
    setSelectedFloorId(floorId);
    setFilters((prev) => ({ ...prev, floorId: "ALL" }));
  };

  // Filter tables by floor tab, status, search, and floor dropdown
  const filteredTables = useMemo(() => {
    let result = tables;

    // Filter by selected floor tab (takes priority; dropdown is reset when tab changes)
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

    // Filter by floor dropdown (only active when no floor tab is selected)
    if (selectedFloorId === null && filters.floorId !== "ALL") {
      result = result.filter((table) => table.floorId === filters.floorId);
    }

    return result;
  }, [tables, selectedFloorId, filters]);

  const handleAddTable = () => {
    openModal("Add Table", <TableForm />);
  };

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
                to: "/",
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
          {/* Floor Tabs */}
          <FloorTabs
            floors={floors}
            selectedFloorId={selectedFloorId}
            onSelectFloor={handleSelectFloor}
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
    </div>
  );
}
