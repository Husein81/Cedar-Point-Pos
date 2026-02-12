import { useCallback, useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { Button, Icon } from "@repo/ui";
import { useOrderStore } from "@/store/orderStore";
import { useModalStore } from "@/store/modalStore";
import { useTableSelectorTransferOrder } from "@/hooks/useOrder";
import { useActiveOrdersByTable } from "@/hooks/useTable";
import { TableSelectorModal } from "./TableSelectorModal";
import type { TableWithFloor } from "@/dto/tables.dto";
import type { Order } from "@repo/types";

// ============================================================================
// TableSelector Component
// ============================================================================

export function TableSelector() {
  const openModal = useModalStore((state) => state.openModal);
  const closeModal = useModalStore((state) => state.closeModal);
  const { getActiveOrder, setTable, createTabWithTable } = useOrderStore();
  const order = getActiveOrder();
  const transferOrder = useTableSelectorTransferOrder();

  // Read tableId from URL search params
  const searchParams = useSearch({ from: "/orders/" });

  // Initialize table from URL params when navigating from tables page
  // This effect runs once with the initial searchParams values
  useEffect(() => {
    const tableId = searchParams?.tableId;
    const tableName = searchParams?.tableName;

    if (tableId && tableName) {
      // Create a new tab with this table (or reuse existing)
      createTabWithTable(tableId, tableName);
    }
  }, []);

  const openMergeRequiredModal = useCallback(
    (params: {
      orderId: string;
      targetTableId: string;
      targetDisplayName: string;
      activeOrderIds: string[];
    }) => {
      const { orderId, targetTableId, targetDisplayName, activeOrderIds } =
        params;

      openModal(
        "Merge Required",
        <MergeTargetSelector
          activeOrderIds={activeOrderIds}
          tableId={targetTableId}
          onSelect={(mergeIntoOrderId) => {
            transferOrder.mutate({
              orderId,
              targetTableId,
              mergeIntoOrderId,
              targetTableDisplayName: targetDisplayName,
            });
          }}
          onCancel={() => {
            closeModal();
          }}
          isPending={transferOrder.isPending}
        />,
        `${targetDisplayName} already has an active order. Select which order to merge into.`,
      );
    },
    [openModal, closeModal, transferOrder],
  );

  useEffect(() => {
    const conflict = transferOrder.conflict;
    if (!conflict) return;

    openMergeRequiredModal({
      orderId: conflict.orderId,
      targetTableId: conflict.targetTableId,
      targetDisplayName: conflict.targetTableDisplayName || "selected table",
      activeOrderIds: conflict.activeOrderIds,
    });
    transferOrder.clearConflict();
  }, [transferOrder.conflict, transferOrder.clearConflict, openMergeRequiredModal]);

  const handleTableSelect = useCallback(
    (table: TableWithFloor) => {
      // Handle clear action (empty id signals clear)
      if (!table.id) {
        setTable(null, null);
        return;
      }

      const displayName = table.floor
        ? `${table.floor.name} - ${table.name}`
        : table.name;

      const currentOrder = getActiveOrder();

      // If same table selected, do nothing
      if (currentOrder?.tableId === table.id) {
        return;
      }

      // If current order has items, show switch/transfer dialog
      const hasItems = currentOrder && currentOrder.items.length > 0;

      if (hasItems && currentOrder.tableId) {
        // Current order has items AND is assigned to a table - prompt user
        const isServerOrder = !currentOrder.id.startsWith("order-");

        openModal(
          "Switch Table",
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The current order on <strong>{currentOrder.tableName}</strong> has{" "}
              {currentOrder.items.length} item
              {currentOrder.items.length !== 1 ? "s" : ""}. What would you like
              to do?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => {
                  // Switch without transfer � create a new tab for the new table
                  createTabWithTable(table.id, displayName);
                  closeModal();
                }}
              >
                <Icon name="ArrowRightLeft" className="h-4 w-4" />
                Switch Without Transfer
                <span className="text-xs text-muted-foreground ml-auto">
                  Keep current order, open new tab
                </span>
              </Button>

              {isServerOrder && (
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  disabled={transferOrder.isPending}
                  onClick={() => {
                    transferOrder.mutate({
                      orderId: currentOrder.id,
                      targetTableId: table.id,
                      targetTableDisplayName: displayName,
                    });
                  }}
                >
                  <Icon name="MoveRight" className="h-4 w-4" />
                  Transfer Order
                  <span className="text-xs text-muted-foreground ml-auto">
                    Move order to {displayName}
                  </span>
                </Button>
              )}

              <Button
                variant="ghost"
                className="justify-start gap-2 text-muted-foreground"
                onClick={() => closeModal()}
              >
                <Icon name="X" className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>,
          "Choose how to handle the current order",
        );
      } else if (hasItems && !currentOrder.tableId) {
        // Order has items but NO table yet � just assign the table.
        // But first check if another tab already has this table's order.
        const existingTableTab = useOrderStore
          .getState()
          .tabs.find((t) => t.order.tableId === table.id);
        if (existingTableTab) {
          // Table already has an open tab � switch to it instead of
          // overwriting the current order's table assignment.
          createTabWithTable(table.id, displayName);
        } else {
          setTable(table.id, displayName);
        }
      } else {
        // Empty order � use createTabWithTable so it finds and activates
        // any existing tab for this table (e.g. an occupied table with
        // a server-persisted order), instead of blindly overwriting.
        createTabWithTable(table.id, displayName);
      }
    },
    [
      getActiveOrder,
      setTable,
      createTabWithTable,
      openModal,
      closeModal,
      transferOrder,
    ],
  );

  const handleOpenModal = () => {
    openModal(
      "Table Selection",
      <TableSelectorModal
        onTableSelect={handleTableSelect}
        currentTableId={order?.tableId}
      />,
    );
  };

  return (
    <Button
      variant={order?.tableId ? "default" : "outline"}
      size="sm"
      onClick={handleOpenModal}
      className="h-7 text-xs gap-1.5"
    >
      <Icon name="Utensils" className="h-3.5 w-3.5" />
      <span className="max-w-24 truncate">
        {order?.tableName || "Select Table"}
      </span>
      <Icon name="ChevronRight" className="h-3 w-3 ml-0.5" />
    </Button>
  );
}

// ============================================================================
// MergeTargetSelector � shown when target table has active orders
// ============================================================================

function MergeTargetSelector({
  activeOrderIds,
  tableId,
  onSelect,
  onCancel,
  isPending,
}: {
  activeOrderIds: string[];
  tableId: string;
  onSelect: (mergeIntoOrderId: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { data: activeOrders = [], isLoading } =
    useActiveOrdersByTable(tableId);

  // Filter to only the orders the backend told us about (intersection)
  const relevantOrders =
    activeOrderIds.length > 0
      ? activeOrders.filter((o: Order) => activeOrderIds.includes(o.id))
      : activeOrders;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="Loader2" className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {relevantOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active orders found on this table.
        </p>
      ) : (
        relevantOrders.map((order: Order) => (
          <Button
            key={order.id}
            variant="outline"
            className="w-full justify-between gap-2"
            disabled={isPending}
            onClick={() => onSelect(order.id)}
          >
            <span className="text-sm font-medium">
              Order #{order.orderNumber ?? order.id.slice(-6)}
            </span>
            <span className="text-xs text-muted-foreground">
              {order.items?.length ?? 0} item
              {(order.items?.length ?? 0) !== 1 ? "s" : ""} &middot;{" "}
              {order.status}
            </span>
          </Button>
        ))
      )}

      <Button
        variant="ghost"
        className="w-full justify-start gap-2 text-muted-foreground"
        onClick={onCancel}
        disabled={isPending}
      >
        <Icon name="X" className="h-4 w-4" />
        Cancel
      </Button>
    </div>
  );
}
