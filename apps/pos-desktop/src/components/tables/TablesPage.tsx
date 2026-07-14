import { Button, Empty, Icon } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

// Hooks & stores
import { useNetworkStatus } from "@/context/NetworkContext";
import { useFloorsByBranch } from "@/hooks/useFloor";
import { useTablesOverview } from "@/hooks/useTable";
import { useTablesSocket } from "@/hooks/useTablesSocket";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { useTableUiStore } from "@/store/tableUiStore";

// Feature components
import MergeTargetSelector from "@/components/orders/MergeTargetSelector";
import { TableSelectorModal } from "@/components/orders/TableSelectorModal";
import { FloorCanvas } from "./FloorCanvas";
import { FloorManagementModal } from "./FloorManagementModal";
import { SeatGuestsModal } from "./SeatGuestsModal";
import { TableDetailsDrawer } from "./TableDetailsDrawer";
import { TableForm } from "./TableForm";
import { TablesGridView } from "./TablesGridView";
import { TablesHeader } from "./TablesHeader";
import { TablesStatsRow } from "./TablesStatsRow";
import { buildTablesStats, deriveTableUiStatus } from "./config";
import { getTableDisplayName, useTableActions } from "./hooks";

export function TablesPage() {
  const { isHighLevelUser } = useAuthStore();
  const { branchId } = useBranchStore();
  const { openModal } = useModalStore();
  const navigate = useNavigate();
  const { isOnline, lastOnlineAt } = useNetworkStatus();

  // Server data — one overview query powers the whole floor.
  const {
    data: tables = [],
    isLoading,
    isFetching,
    refetch,
  } = useTablesOverview();
  const { data: floors = [] } = useFloorsByBranch();
  const { isConnected } = useTablesSocket(branchId);

  // UI state
  const view = useTableUiStore((s) => s.view);
  const filters = useTableUiStore((s) => s.filters);
  const activeFloorId = useTableUiStore((s) => s.activeFloorId);
  const isEditingLayout = useTableUiStore((s) => s.isEditingLayout);
  const selectedTableId = useTableUiStore((s) => s.selectedTableId);
  const selectTable = useTableUiStore((s) => s.selectTable);

  const canManage = Boolean(isHighLevelUser) && isOnline;
  const isEditing = isEditingLayout && view === "canvas" && canManage;

  // The canvas shows one floor at a time (positions are per-floor); the grid
  // supports "All Floors". Unassigned tables get their own bucket.
  const unassignedCount = useMemo(
    () => tables.filter((t) => !t.floorId).length,
    [tables],
  );
  const effectiveFloorId = useMemo(() => {
    if (activeFloorId !== "ALL") return activeFloorId;
    if (view === "grid") return "ALL";
    const first = floors[0];
    if (first) return first.id;
    return unassignedCount > 0 ? "NONE" : "ALL";
  }, [activeFloorId, floors, unassignedCount, view]);

  const floorTables = useMemo(() => {
    if (effectiveFloorId === "ALL") return tables;
    if (effectiveFloorId === "NONE") return tables.filter((t) => !t.floorId);
    return tables.filter((t) => t.floorId === effectiveFloorId);
  }, [effectiveFloorId, tables]);

  // Search + status + capacity matching. On the canvas, non-matching tables
  // are dimmed (not removed) so the floor keeps its spatial stability.
  const matchedIds = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const matched = new Set<string>();

    for (const table of floorTables) {
      if (filters.minCapacity !== null && table.capacity < filters.minCapacity)
        continue;

      if (filters.statuses.length > 0) {
        const uiStatus = deriveTableUiStatus(table, table.activeOrder?.status);
        if (!filters.statuses.includes(uiStatus)) continue;
      }

      if (search) {
        const order = table.activeOrder;
        const haystack = [
          table.name,
          String(table.tableNumber),
          table.floor?.name,
          order?.userName,
          order?.customerName,
          order?.orderNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) continue;
      }

      matched.add(table.id);
    }
    return matched;
  }, [filters, floorTables]);

  const stats = useMemo(() => buildTablesStats(tables), [tables]);
  const inService =
    stats.byStatus.OCCUPIED +
    stats.byStatus.PREPARING +
    stats.byStatus.READY +
    stats.byStatus.BILLING;

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) ?? null,
    [selectedTableId, tables],
  );

  // Central action dispatcher (context menu, drawer, grid all share it).
  const { handleAction } = useTableActions({
    renderTransferPicker: ({ sourceTable, onPick }) => (
      <TableSelectorModal
        currentTableId={sourceTable.id}
        onTableSelect={(target) => {
          if (!target.id) return;
          onPick({
            id: target.id,
            displayName: getTableDisplayName(target),
          });
        }}
      />
    ),
    renderMergeSelector: (params) => (
      <MergeTargetSelector
        activeOrderIds={params.activeOrderIds}
        tableId={params.tableId}
        onSelect={params.onSelect}
        onCancel={params.onCancel}
        isPending={params.isPending}
      />
    ),
    renderEditForm: (table) => <TableForm table={table} />,
    renderSeatGuests: ({ table, onConfirm, onCancel }) => (
      <SeatGuestsModal
        tableName={getTableDisplayName(table)}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    ),
    renderDeleteConfirm: ({ table, onConfirm, onCancel }) => (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          This will remove <strong>{getTableDisplayName(table)}</strong> from
          the floor plan. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" iconName="Trash2" onClick={onConfirm}>
            Delete Table
          </Button>
        </div>
      </div>
    ),
  });

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
    <div className="flex flex-col gap-4 p-6">
      {/* Page-level view toggle + primary actions */}
      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          iconName="Plus"
          onClick={() =>
            navigate({ to: "/", search: { orderType: "dine_in" } })
          }
        >
          New Order
        </Button>
      </div>

      {/* Offline cache freshness badge */}
      {!isOnline && tables.length > 0 && lastOnlineAt && (
        <div className="animate-in fade-in slide-in-from-top-1 flex w-fit items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600 duration-300 dark:text-amber-400">
          <Icon name="Database" className="h-3.5 w-3.5" />
          <span>
            Table layout cached · last synced{" "}
            {Math.round((Date.now() - lastOnlineAt) / 60_000)} min ago
          </span>
        </div>
      )}

      <TablesHeader
        floors={floors}
        unassignedCount={unassignedCount}
        floorValue={effectiveFloorId}
        occupancy={{
          inService,
          total: stats.total - stats.byStatus.DISABLED,
        }}
        isConnected={isConnected}
        isOnline={isOnline}
        canManage={canManage}
        isEditing={isEditing}
        isRefreshing={isFetching}
        onRefresh={() => void refetch()}
        onAddTable={() => openModal("Add Table", <TableForm />)}
        onManageFloors={() =>
          openModal("Manage Floors", <FloorManagementModal />)
        }
      />

      <TablesStatsRow stats={stats} />

      {/*
            The page shell (ClientLayout) is a natural-height scroll area —
            there is no fixed-height ancestor for a `flex-1`/`h-full` chain
            to resolve against (see main-layout.tsx / client-layout.tsx; no
            other page in this app relies on one, e.g. kitchen.tsx just flows
            naturally). The floor canvas is a pan/zoom viewport though, so it
            genuinely needs a bounded box — give it a concrete height instead
            of fighting the page for space. Grid view has no such need and
            flows with the page like everywhere else.
          */}
      <div className="flex gap-4">
        {view === "canvas" ? (
          <div className="h-[calc(100vh-20rem)] w-[calc(100vw-20rem)] flex-1">
            <FloorCanvas
              key={`${branchId}:${effectiveFloorId}`}
              floorKey={`${branchId}:${effectiveFloorId}`}
              tables={floorTables}
              matchedIds={matchedIds}
              selectedTableId={selectedTableId}
              canManage={canManage}
              isEditing={isEditing}
              onSelect={selectTable}
              onAction={handleAction}
            />
          </div>
        ) : (
          <div>
            <TablesGridView
              tables={floorTables.filter((t) => matchedIds.has(t.id))}
              selectedTableId={selectedTableId}
              isLoading={isLoading}
              onSelect={selectTable}
            />
          </div>
        )}
      </div>

      <TableDetailsDrawer
        table={selectedTable}
        canManage={canManage}
        onClose={() => selectTable(null)}
        onAction={handleAction}
      />
    </div>
  );
}
