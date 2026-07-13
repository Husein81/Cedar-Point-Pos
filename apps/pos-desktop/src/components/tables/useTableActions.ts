import { useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { OrderStatus, TableStatus } from "@repo/types";
import { toast } from "@repo/ui";
import type { ServerOrderWithPayments } from "@/dto/order.dto";
import type { TableOverview } from "@/dto/tables.dto";
import { useTableSelectorTransferOrder, useUpdateOrderStatus } from "@/hooks/useOrder";
import {
  useDeleteTable,
  useFetchActiveOrdersByTable,
  useUpdateTable,
  useUpdateTableStatus,
} from "@/hooks/useTable";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { useTableUiStore } from "@/store/tableUiStore";
import type { TableNodeAction } from "./TableNode";

/** "Terrace - T4" — the display convention used across the order screen. */
export const getTableDisplayName = (
  table: Pick<TableOverview, "name" | "floor">,
): string => (table.floor ? `${table.floor.name} - ${table.name}` : table.name);

export interface TableActionsApi {
  handleAction: (table: TableOverview, action: TableNodeAction) => void;
  isTransferPending: boolean;
}

/**
 * Central dispatcher for every table action (canvas context menu, details
 * drawer quick actions, grid view). Reuses the existing order flows:
 * seat/open via orderStore tabs, transfer via useTableSelectorTransferOrder
 * (including the merge-conflict flow), status changes via the offline-aware
 * useUpdateTableStatus.
 *
 * The transfer target picker and merge selector are modals; their components
 * are passed in by the page (renderTransferPicker/renderMergeSelector) so this
 * hook stays JSX-free.
 */
export const useTableActions = (options: {
  renderTransferPicker: (params: {
    sourceTable: TableOverview;
    onPick: (target: { id: string; displayName: string }) => void;
  }) => React.ReactNode;
  renderMergeSelector: (params: {
    activeOrderIds: string[];
    tableId: string;
    onSelect: (mergeIntoOrderId: string) => void;
    onCancel: () => void;
    isPending: boolean;
  }) => React.ReactNode;
  renderEditForm: (table: TableOverview) => React.ReactNode;
  renderDeleteConfirm: (params: {
    table: TableOverview;
    onConfirm: () => void;
    onCancel: () => void;
  }) => React.ReactNode;
  renderSeatGuests?: (params: {
    table: TableOverview;
    onConfirm: (guestCount?: number) => void;
    onCancel: () => void;
  }) => React.ReactNode;
}): TableActionsApi => {
  const {
    renderTransferPicker,
    renderMergeSelector,
    renderEditForm,
    renderDeleteConfirm,
    renderSeatGuests,
  } = options;

  const navigate = useNavigate();
  const { openModal, closeModal } = useModalStore();
  const { loadOrder, createTabWithTable } = useOrderStore();
  const selectTable = useTableUiStore((s) => s.selectTable);

  const statusMutation = useUpdateTableStatus();
  const updateTableMutation = useUpdateTable();
  const deleteTableMutation = useDeleteTable();
  const orderStatusMutation = useUpdateOrderStatus();
  const fetchActiveOrders = useFetchActiveOrdersByTable();
  const transferOrder = useTableSelectorTransferOrder();

  const seatTable = useCallback(
    (table: TableOverview, guestCount?: number) => {
      const displayName = getTableDisplayName(table);
      createTabWithTable(table.id, displayName);
      if (guestCount !== undefined) {
        useOrderStore.getState().setGuestCount(guestCount);
      }
      selectTable(null);
      void navigate({
        to: "/",
        search: { tableId: table.id, tableName: displayName },
      });
    },
    [createTabWithTable, navigate, selectTable],
  );

  const openTableOrder = useCallback(
    async (table: TableOverview) => {
      try {
        const activeOrders = await fetchActiveOrders(table.id);

        if (activeOrders.length > 0) {
          const latest = [...activeOrders].sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime(),
          )[0];

          const tabId = loadOrder(latest as unknown as ServerOrderWithPayments);
          if (tabId) {
            selectTable(null);
            void navigate({ to: "/", search: { tableId: table.id } });
          }
          return;
        }

        // A PAID order is no longer "active" — show its invoice instead.
        if (table.activeOrder) {
          selectTable(null);
          void navigate({
            to: "/invoices/$orderId",
            params: { orderId: table.activeOrder.orderId },
          });
          return;
        }

        seatTable(table);
      } catch {
        toast.error("Failed to load the table's order");
      }
    },
    [fetchActiveOrders, loadOrder, navigate, seatTable, selectTable],
  );

  const startTransfer = useCallback(
    (table: TableOverview) => {
      const order = table.activeOrder;
      if (!order) {
        toast.error("This table has no active order to transfer");
        return;
      }

      openModal(
        "Transfer Table",
        renderTransferPicker({
          sourceTable: table,
          onPick: (target) => {
            if (!target.id || target.id === table.id) return;
            transferOrder.mutate({
              orderId: order.orderId,
              targetTableId: target.id,
              targetTableDisplayName: target.displayName,
            });
          },
        }),
        `Move the order on ${getTableDisplayName(table)} to another table.`,
      );
    },
    [openModal, renderTransferPicker, transferOrder],
  );

  // Transfer hit an occupied target → ask which order to merge into.
  useEffect(() => {
    const conflict = transferOrder.conflict;
    if (!conflict) return;

    const displayName = conflict.targetTableDisplayName || "selected table";
    openModal(
      "Merge Required",
      renderMergeSelector({
        activeOrderIds: conflict.activeOrderIds,
        tableId: conflict.targetTableId,
        onSelect: (mergeIntoOrderId) => {
          transferOrder.mutate({
            orderId: conflict.orderId,
            targetTableId: conflict.targetTableId,
            mergeIntoOrderId,
            targetTableDisplayName: displayName,
          });
        },
        onCancel: closeModal,
        isPending: transferOrder.isPending,
      }),
      `${displayName} already has an active order. Select which order to merge into.`,
    );
    transferOrder.clearConflict();
  }, [closeModal, openModal, renderMergeSelector, transferOrder]);

  const handleAction = useCallback(
    (table: TableOverview, action: TableNodeAction) => {
      switch (action) {
        case "seat":
          if (renderSeatGuests) {
            openModal(
              "Seat Guests",
              renderSeatGuests({
                table,
                onConfirm: (guestCount) => {
                  seatTable(table, guestCount);
                  closeModal();
                },
                onCancel: closeModal,
              }),
            );
          } else {
            seatTable(table);
          }
          break;
        case "open":
          void openTableOrder(table);
          break;
        case "reserve":
          statusMutation.mutate({ id: table.id, status: TableStatus.RESERVED });
          break;
        case "unreserve":
          statusMutation.mutate({
            id: table.id,
            status: TableStatus.AVAILABLE,
          });
          break;
        case "complete":
          if (table.activeOrder) {
            orderStatusMutation.mutate(
              { id: table.activeOrder.orderId, status: OrderStatus.COMPLETED },
              {
                onSuccess: () => toast.success("Order completed, table freed"),
                onError: (error) =>
                  toast.error(error.message || "Failed to complete the order"),
              },
            );
          }
          break;
        case "transfer":
          startTransfer(table);
          break;
        case "edit":
          openModal("Edit Table", renderEditForm(table));
          break;
        case "disable":
          updateTableMutation.mutate({
            id: table.id,
            data: { isActive: false },
          });
          break;
        case "enable":
          updateTableMutation.mutate({
            id: table.id,
            data: { isActive: true },
          });
          break;
        case "delete":
          openModal(
            "Delete Table",
            renderDeleteConfirm({
              table,
              onConfirm: () => {
                deleteTableMutation.mutate(table.id);
                selectTable(null);
                closeModal();
              },
              onCancel: closeModal,
            }),
            "This action cannot be undone.",
          );
          break;
      }
    },
    [
      closeModal,
      deleteTableMutation,
      openModal,
      openTableOrder,
      orderStatusMutation,
      renderDeleteConfirm,
      renderEditForm,
      renderSeatGuests,
      seatTable,
      selectTable,
      startTransfer,
      statusMutation,
      updateTableMutation,
    ],
  );

  return { handleAction, isTransferPending: transferOrder.isPending };
};
