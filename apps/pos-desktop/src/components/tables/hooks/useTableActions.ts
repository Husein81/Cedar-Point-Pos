import { useCallback } from "react";
import { OrderStatus, TableStatus } from "@repo/types";
import { toast } from "@repo/ui";
import type { TableOverview } from "@/dto/tables.dto";
import { useUpdateOrderStatus } from "@/hooks/useOrder";
import {
  useDeleteTable,
  useUpdateTable,
  useUpdateTableStatus,
} from "@/hooks/useTable";
import { useModalStore } from "@/store/modalStore";
import { useTableUiStore } from "@/store/tableUiStore";
import { getTableDisplayName } from "../config";
import type { TableNodeAction } from "../TableNode";
import { useOpenTableOrder } from "./useOpenTableOrder";
import { useTableTransfer } from "./useTableTransfer";

export { getTableDisplayName };

export interface TableActionsApi {
  handleAction: (table: TableOverview, action: TableNodeAction) => void;
  isTransferPending: boolean;
}

/**
 * Central dispatcher for every table action (canvas context menu, details
 * drawer quick actions, grid view). It owns only the simple, single-step
 * mutations (reserve/unreserve/enable/disable/complete/edit/delete) and
 * routes the two multi-step flows to their own hooks: seating/resuming an
 * order (useOpenTableOrder) and transferring one (useTableTransfer,
 * including the merge-conflict detour).
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

  const { openModal, closeModal } = useModalStore();
  const selectTable = useTableUiStore((s) => s.selectTable);

  const statusMutation = useUpdateTableStatus();
  const updateTableMutation = useUpdateTable();
  const deleteTableMutation = useDeleteTable();
  const orderStatusMutation = useUpdateOrderStatus();

  const { seatTable, openTableOrder } = useOpenTableOrder();
  const { startTransfer, isTransferPending } = useTableTransfer({
    renderTransferPicker,
    renderMergeSelector,
  });

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

  return { handleAction, isTransferPending };
};
