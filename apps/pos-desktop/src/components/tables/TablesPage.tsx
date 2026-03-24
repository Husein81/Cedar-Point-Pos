import { Button, Empty, Icon } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { Activity, useMemo, useState } from "react";

// Hooks
import { useLocalFloors, useLocalTables } from "@/hooks/offline";
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

  if (user?.tenant?.businessType === "RETAIL") {
    navigate({ to: "/orders" });
  }

  const {
    floors: localFloors,
    isLoading: isLoadingFloors,
    refetch: refetchFloors,
  } = useLocalFloors(branchId ?? undefined);
  const {
    tables: localTables,
    isLoading: isLoadingTables,
    refetch: refetchTables,
  } = useLocalTables(branchId ?? undefined);

  const tableCountByFloor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const table of localTables) {
      if (!table.floorId) continue;
      counts.set(table.floorId, (counts.get(table.floorId) ?? 0) + 1);
    }
    return counts;
  }, [localTables]);

  const floors = useMemo<FloorWithTableCount[]>(
    () =>
      localFloors.map((floor) => ({
        ...floor,
        createdAt: new Date(floor.createdAt),
        updatedAt: new Date(floor.updatedAt),
        _count: {
          tables: tableCountByFloor.get(floor.id) ?? 0,
        },
      })),
    [localFloors, tableCountByFloor],
  );

  const floorMap = useMemo(
    () => new Map(localFloors.map((floor) => [floor.id, floor])),
    [localFloors],
  );

  const tables = useMemo<TableWithFloor[]>(
    () =>
      localTables.map((table) => {
        const floor = table.floorId ? floorMap.get(table.floorId) : undefined;
        return {
          ...table,
          floor: floor
            ? {
                id: floor.id,
                name: floor.name,
              }
            : null,
        };
      }),
    [localTables, floorMap],
  );

  const stats = useMemo(
    () => ({
      total: localTables.length,
      available: localTables.filter((table) => table.status === "AVAILABLE")
        .length,
      occupied: localTables.filter((table) => table.status === "OCCUPIED")
        .length,
      reserved: localTables.filter((table) => table.status === "RESERVED")
        .length,
    }),
    [localTables],
  );

  const [activeView, setActiveView] = useState<ActiveView>("dine-in");
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  const [filters, setFilters] = useState<TableFiltersType>({
    search: "",
    status: "ALL",
    floorId: "ALL",
  });

  const filteredTables = useMemo(() => {
    let result = tables;

    if (selectedFloorId !== null) {
      result = result.filter((table) => table.floorId === selectedFloorId);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (table) =>
          table.name.toLowerCase().includes(search) ||
          table.tableNumber.toString().includes(search),
      );
    }

    if (filters.status !== "ALL") {
      result = result.filter(
        (table) => table.status === (filters.status as string),
      );
    }

    if (filters.floorId !== "ALL") {
      result = result.filter((table) => table.floorId === filters.floorId);
    }

    return result;
  }, [tables, selectedFloorId, filters]);

  const handleAddTable = () => {
    openModal("Add Table", <TableForm />);
  };

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
                  onClick={() => {
                    void refetchFloors();
                    void refetchTables();
                  }}
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
          <TablesStatsCards stats={stats} />

          <FloorTabs
            floors={floors}
            selectedFloorId={selectedFloorId}
            onSelectFloor={setSelectedFloorId}
            isLoading={isLoadingFloors}
          />

          <TableFilters
            filters={filters}
            onFiltersChange={setFilters}
            floors={floors.map((f) => ({ id: f.id, name: f.name }))}
          />

          <TableGrid tables={filteredTables} isLoading={isLoadingTables} />
        </>
      ) : (
        <OngoingOrdersList />
      )}
    </div>
  );
}
