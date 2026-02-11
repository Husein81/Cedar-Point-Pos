import { useActiveOrdersByTable } from "@/hooks/useTable";
import { useMergeOrders, useTransferOrder } from "@/hooks/useOrder";
import { useOrderStore } from "@/store/orderStore";
import { useTablesByBranch } from "@/hooks/useTable";
import type { Order } from "@repo/types";
import type { TableWithFloor } from "@/dto/tables.dto";
import { Badge, Button, cn, Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// =====================
// Status badge config
// =====================
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  ON_HOLD: {
    label: "On Hold",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  PENDING: {
    label: "Pending",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  SENT_TO_KITCHEN: {
    label: "Kitchen",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  },
  READY: {
    label: "Ready",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  PAID: {
    label: "Paid",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  PARTIALLY_PAID: {
    label: "Partial Pay",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
};

// =====================
// Sub-views
// =====================
type DialogView = "orders" | "transfer" | "merge" | "transfer-merge";

// =====================
// Props
// =====================
interface TableActiveOrdersDialogProps {
  table: TableWithFloor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TableActiveOrdersDialog({
  table,
  open,
  onOpenChange,
}: TableActiveOrdersDialogProps) {
  const navigate = useNavigate();
  const { loadOrder } = useOrderStore();
  const { createTabWithTable } = useOrderStore();

  const { data: activeOrders = [], isLoading } = useActiveOrdersByTable(
    open ? table.id : null,
  );
  const { data: allTables = [] } = useTablesByBranch();

  const transferMutation = useTransferOrder();
  const mergeMutation = useMergeOrders();

  const [view, setView] = useState<DialogView>("orders");
  const [transferOrderId, setTransferOrderId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [transferTargetTable, setTransferTargetTable] =
    useState<TableWithFloor | null>(null);

  const tableName = table.floor
    ? `${table.floor.name} - ${table.name}`
    : table.name;

  // Reset view when dialog opens/closes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setView("orders");
        setTransferOrderId(null);
        setMergeTargetId(null);
        setTransferTargetTable(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  // Load an order into the POS cart
  const handleLoadOrder = useCallback(
    (order: Order) => {
      const tabId = loadOrder(order);
      if (tabId) {
        handleOpenChange(false);
        navigate({
          to: "/orders",
          search: {
            tableId: table.id,
            tableName,
          },
        });
      }
    },
    [loadOrder, navigate, table.id, tableName, handleOpenChange],
  );

  // Create a new order on this table
  const handleNewOrder = useCallback(() => {
    createTabWithTable(table.id, tableName);
    handleOpenChange(false);
    navigate({
      to: "/orders",
      search: {
        tableId: table.id,
        tableName,
      },
    });
  }, [createTabWithTable, navigate, table.id, tableName, handleOpenChange]);

  // Start transfer flow
  const handleStartTransfer = useCallback((orderId: string) => {
    setTransferOrderId(orderId);
    setView("transfer");
  }, []);

  // Execute transfer — backend will detect occupied tables and return 409
  const handleTransfer = useCallback(
    (targetTable: TableWithFloor) => {
      if (!transferOrderId) return;

      transferMutation.mutate(
        { orderId: transferOrderId, targetTableId: targetTable.id },
        {
          onSuccess: (transferredOrder) => {
            // Refresh the local tab with full server data (includes modifiers)
            loadOrder(transferredOrder as any, true);
            toast.success("Order transferred successfully");
            handleOpenChange(false);
          },
          onError: (err: any) => {
            const data = err?.response?.data;
            // If target has active orders, show merge selection
            if (data?.code === "TABLE_HAS_ACTIVE_ORDER") {
              setTransferTargetTable(targetTable);
              setView("transfer-merge");
              return;
            }
            toast.error(data?.message || "Failed to transfer order");
          },
        },
      );
    },
    [transferOrderId, transferMutation, handleOpenChange, loadOrder],
  );

  // Execute atomic transfer + merge for occupied tables
  const handleTransferAndMerge = useCallback(
    (targetMergeOrderId: string) => {
      if (!transferOrderId || !transferTargetTable) return;

      // Single atomic call: transfer + merge in one request
      transferMutation.mutate(
        {
          orderId: transferOrderId,
          targetTableId: transferTargetTable.id,
          mergeIntoOrderId: targetMergeOrderId,
        },
        {
          onSuccess: (mergedOrder) => {
            // Refresh the local tab with full server data (includes modifiers)
            loadOrder(mergedOrder as any, true);
            toast.success("Order transferred and merged successfully");
            handleOpenChange(false);
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message ||
                "Failed to transfer and merge order",
            );
          },
        },
      );
    },
    [
      transferOrderId,
      transferTargetTable,
      transferMutation,
      handleOpenChange,
      loadOrder,
    ],
  );

  // Start merge flow
  const handleStartMerge = useCallback(() => {
    if (activeOrders.length < 2) {
      toast.error("Need at least 2 orders on this table to merge");
      return;
    }
    setView("merge");
  }, [activeOrders.length]);

  // Execute merge
  const handleMerge = useCallback(
    (sourceOrderId: string) => {
      if (!mergeTargetId) return;

      mergeMutation.mutate(
        { targetOrderId: mergeTargetId, sourceOrderId },
        {
          onSuccess: (mergedOrder) => {
            // Refresh the local tab with full server data (includes modifiers)
            loadOrder(mergedOrder as any, true);
            toast.success("Orders merged successfully");
            handleOpenChange(false);
          },
          onError: (err: any) => {
            toast.error(
              err?.response?.data?.message || "Failed to merge orders",
            );
          },
        },
      );
    },
    [mergeTargetId, mergeMutation, handleOpenChange, loadOrder],
  );

  // Available tables for transfer (exclude current table)
  const transferableTables = allTables.filter(
    (t) => t.id !== table.id && t.isActive,
  );

  return (
    <Shad.Dialog open={open} onOpenChange={handleOpenChange}>
      <Shad.DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <Shad.DialogHeader>
          <Shad.DialogTitle className="flex items-center gap-2">
            <Icon name="LayoutGrid" className="h-5 w-5" />
            {view === "orders" && `Table ${table.tableNumber} — ${table.name}`}
            {view === "transfer" && "Transfer Order"}
            {view === "merge" && "Merge Orders"}
            {view === "transfer-merge" && "Transfer & Merge"}
          </Shad.DialogTitle>
          <Shad.DialogDescription>
            {view === "orders" &&
              `${activeOrders.length} active order${activeOrders.length !== 1 ? "s" : ""} on this table`}
            {view === "transfer" && "Select a table to transfer this order to"}
            {view === "merge" &&
              (mergeTargetId
                ? "Select the order to merge INTO the target"
                : "Select the target order (items will be merged into this one)")}
            {view === "transfer-merge" &&
              `${transferTargetTable?.name} already has an active order. Select the order to merge into.`}
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          )}

          {/* Orders View */}
          {view === "orders" && !isLoading && (
            <>
              {activeOrders.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Icon
                    name="ClipboardList"
                    className="h-10 w-10 mx-auto mb-2 opacity-40"
                  />
                  <p>No active orders on this table</p>
                </div>
              ) : (
                activeOrders.map((order) => (
                  <ActiveOrderCard
                    key={order.id}
                    order={order}
                    onLoad={handleLoadOrder}
                    onTransfer={handleStartTransfer}
                  />
                ))
              )}
            </>
          )}

          {/* Transfer View — pick target table */}
          {view === "transfer" && (
            <div className="space-y-2">
              {transferableTables.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  No other tables available
                </p>
              ) : (
                transferableTables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTransfer(t)}
                    disabled={transferMutation.isPending}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg border p-3",
                      "hover:bg-accent transition-colors text-left",
                      transferMutation.isPending && "opacity-50 cursor-wait",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-bold">
                        {t.tableNumber}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.name}</p>
                        {t.floor && (
                          <p className="text-xs text-muted-foreground">
                            {t.floor.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        t.status === "AVAILABLE"
                          ? "text-emerald-600"
                          : t.status === "OCCUPIED"
                            ? "text-red-600"
                            : "text-purple-600",
                      )}
                    >
                      {t.status}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Merge View — step 1: pick target, step 2: pick source */}
          {view === "merge" && (
            <div className="space-y-2">
              {!mergeTargetId ? (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select the order that will <strong>keep</strong> all items:
                  </p>
                  {activeOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setMergeTargetId(order.id)}
                      className="w-full rounded-lg border p-3 hover:bg-accent transition-colors text-left"
                    >
                      <MiniOrderInfo order={order} />
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select the order to merge <strong>into</strong> the target
                    (this order will be cancelled):
                  </p>
                  {activeOrders
                    .filter((o) => o.id !== mergeTargetId)
                    .map((order) => (
                      <button
                        key={order.id}
                        onClick={() => handleMerge(order.id)}
                        disabled={mergeMutation.isPending}
                        className={cn(
                          "w-full rounded-lg border p-3 hover:bg-accent transition-colors text-left",
                          mergeMutation.isPending && "opacity-50 cursor-wait",
                        )}
                      >
                        <MiniOrderInfo order={order} />
                      </button>
                    ))}
                </>
              )}
            </div>
          )}

          {/* Transfer-Merge View — target table is occupied, pick which order to merge into */}
          {view === "transfer-merge" && transferTargetTable && (
            <TransferMergeView
              transferTargetTable={transferTargetTable}
              onMerge={handleTransferAndMerge}
              isPending={transferMutation.isPending}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-3 border-t">
          {view === "orders" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                className="gap-1.5"
              >
                Close
              </Button>
              <div className="flex-1" />
              {activeOrders.length >= 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartMerge}
                  className="gap-1.5"
                >
                  <Icon name="Merge" className="h-3.5 w-3.5" />
                  Merge
                </Button>
              )}
              {activeOrders.length === 0 && (
                <Button size="sm" onClick={handleNewOrder} className="gap-1.5">
                  <Icon name="Plus" className="h-3.5 w-3.5" />
                  New Order
                </Button>
              )}
            </>
          )}

          {(view === "transfer" ||
            view === "merge" ||
            view === "transfer-merge") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (view === "transfer-merge") {
                  setView("transfer");
                  setTransferTargetTable(null);
                } else {
                  setView("orders");
                  setTransferOrderId(null);
                  setMergeTargetId(null);
                  setTransferTargetTable(null);
                }
              }}
              className="gap-1.5"
            >
              <Icon name="ArrowLeft" className="h-3.5 w-3.5" />
              Back
            </Button>
          )}
        </div>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
}

// =====================
// Active Order Card
// =====================

function ActiveOrderCard({
  order,
  onLoad,
  onTransfer,
}: {
  order: Order;
  onLoad: (order: Order) => void;
  onTransfer: (orderId: string) => void;
}) {
  const statusConfig = STATUS_BADGE[order.status] ?? {
    label: order.status,
    className: "bg-muted text-muted-foreground",
  };

  const itemCount = order.items?.length ?? 0;
  const total = parseFloat(String(order.total ?? 0));
  const createdAgo = formatDistanceToNow(new Date(order.createdAt), {
    addSuffix: true,
  });

  return (
    <div className="flex flex-col rounded-lg border bg-card p-3 transition-all hover:shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {order.orderNumber ? `#${order.orderNumber}` : "Order"}
          </span>
          <Badge
            variant="outline"
            className={cn("text-xs", statusConfig.className)}
          >
            {statusConfig.label}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{createdAgo}</span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <Icon name="ShoppingCart" className="h-3 w-3" />
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
        {order.customer && (
          <span className="flex items-center gap-1">
            <Icon name="User" className="h-3 w-3" />
            {(order.customer as any).name}
          </span>
        )}
        <span className="font-bold text-foreground ml-auto">
          ${total.toFixed(2)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onTransfer(order.id)}
          className="gap-1.5 text-xs"
        >
          <Icon name="ArrowRightLeft" className="h-3 w-3" />
          Transfer
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={() => onLoad(order)}
          className="gap-1.5 text-xs"
        >
          <Icon name="Upload" className="h-3 w-3" />
          Load
        </Button>
      </div>
    </div>
  );
}

// =====================
// Transfer Merge View (fetch target table orders and show merge options)
// =====================
function TransferMergeView({
  transferTargetTable,
  onMerge,
  isPending,
}: {
  transferTargetTable: TableWithFloor;
  onMerge: (targetOrderId: string) => void;
  isPending: boolean;
}) {
  const { data: targetOrders = [], isLoading } = useActiveOrdersByTable(
    transferTargetTable.id,
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (targetOrders.length === 0) {
    return (
      <p className="text-center py-4 text-muted-foreground">
        No active orders found on the target table.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-2">
        Select the order on <strong>{transferTargetTable.name}</strong> to merge
        your transferred order into:
      </p>
      {targetOrders.map((order) => (
        <button
          key={order.id}
          onClick={() => onMerge(order.id)}
          disabled={isPending}
          className={cn(
            "w-full rounded-lg border p-3 hover:bg-accent transition-colors text-left",
            isPending && "opacity-50 cursor-wait",
          )}
        >
          <MiniOrderInfo order={order} />
        </button>
      ))}
    </div>
  );
}

// =====================
// Mini Order Info (used in merge view)
// =====================
function MiniOrderInfo({ order }: { order: Order }) {
  const statusConfig = STATUS_BADGE[order.status] ?? {
    label: order.status,
    className: "bg-muted text-muted-foreground",
  };

  const itemCount = order.items?.length ?? 0;
  const total = parseFloat(String(order.total ?? 0));

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">
          {order.orderNumber ? `#${order.orderNumber}` : "Order"}
        </span>
        <Badge
          variant="outline"
          className={cn("text-xs", statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
      </div>
      <span className="font-bold text-sm">${total.toFixed(2)}</span>
    </div>
  );
}
