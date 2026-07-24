import { useCallback } from "react";
import { OrderStatus, PaymentStatus, TableStatus } from "@repo/types";
import { toast } from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";
import type { TableOverview } from "@/dto/tables.dto";
import { useUpdateOrderStatus } from "@/hooks/useOrder";
import {
  useDeleteTable,
  useFetchActiveOrdersByTable,
  useUpdateTable,
  useUpdateTableStatus,
} from "@/hooks/useTable";
import {
  useCancelReservation,
  useFetchTableReservation,
} from "@/hooks/useReservations";
import { extractErrorMessage } from "@/utils/error";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { useTableUiStore } from "@/store/tableUiStore";
import { getTableDisplayName } from "../config";
import { TablePaymentForm } from "../TablePaymentForm";
import type { TableNodeAction } from "../TableNode";
import { useOpenTableOrder } from "./useOpenTableOrder";
import { useTableTransfer } from "./useTableTransfer";

export { getTableDisplayName };

export interface TableActionsApi {
  handleAction: (table: TableOverview, action: TableNodeAction) => void;
  isTransferPending: boolean;
}

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
  renderFreeConfirm: (params: {
    table: TableOverview;
    onConfirm: () => void;
    onCancel: () => void;
  }) => React.ReactNode;
  renderSeatGuests?: (params: {
    table: TableOverview;
    onConfirm: (guestCount?: number) => void;
    onCancel: () => void;
  }) => React.ReactNode;
  renderReserveForm: (table: TableOverview) => React.ReactNode;
}): TableActionsApi => {
  const {
    renderTransferPicker,
    renderMergeSelector,
    renderEditForm,
    renderDeleteConfirm,
    renderFreeConfirm,
    renderSeatGuests,
    renderReserveForm,
  } = options;

  const queryClient = useQueryClient();
  const { openModal, closeModal } = useModalStore();
  const selectTable = useTableUiStore((s) => s.selectTable);
  const { closeTab } = useOrderStore();

  const statusMutation = useUpdateTableStatus();
  const updateTableMutation = useUpdateTable();
  const deleteTableMutation = useDeleteTable();
  const orderStatusMutation = useUpdateOrderStatus();
  const cancelReservationMutation = useCancelReservation();
  const fetchTableReservation = useFetchTableReservation();

  const { seatTable, openTableOrder } = useOpenTableOrder();
  const { startTransfer, isTransferPending } = useTableTransfer({
    renderTransferPicker,
    renderMergeSelector,
  });
  const fetchActiveOrders = useFetchActiveOrdersByTable();

  const freeTable = useCallback(
    async (table: TableOverview) => {
      try {
        const activeOrders = await fetchActiveOrders(table.id);

        if (activeOrders.length === 0) {
          statusMutation.mutate({
            id: table.id,
            status: TableStatus.AVAILABLE,
          });
          selectTable(null);
          return;
        }

        // A paid order is never voided when freeing a table — it's completed
        // (closing the sale, deducting stock). Only genuinely unpaid orders are
        // cancelled. This is what makes "pay only" safe to free.
        let completedCount = 0;
        let cancelledCount = 0;
        for (const order of activeOrders) {
          const isPaid = order.paymentStatus === PaymentStatus.PAID;
          await orderStatusMutation.mutateAsync({
            id: order.id,
            status: isPaid ? OrderStatus.COMPLETED : OrderStatus.CANCELLED,
          });
          if (isPaid) completedCount += 1;
          else cancelledCount += 1;
        }

        const parts: string[] = [];
        if (completedCount > 0) parts.push(`${completedCount} completed`);
        if (cancelledCount > 0) parts.push(`${cancelledCount} cancelled`);
        toast.success(`Table freed (${parts.join(", ")})`);
        selectTable(null);
      } catch (error) {
        toast.error(extractErrorMessage(error, "Failed to free the table"));
      }
    },
    [fetchActiveOrders, orderStatusMutation, selectTable, statusMutation],
  );

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
        case "free":
          openModal(
            "Free Table",
            renderFreeConfirm({
              table,
              onConfirm: () => {
                void freeTable(table);
                closeModal();
              },
              onCancel: closeModal,
            }),
            "Unpaid orders on this table will be cancelled.",
          );
          break;
        case "reserve":
          openModal(
            `Reserve ${getTableDisplayName(table)}`,
            renderReserveForm(table),
          );
          break;
        case "unreserve":
          void (async () => {
            try {
              const active = await fetchTableReservation(table.id);
              if (!active) {
                toast.error("No active reservation found for this table");
                return;
              }
              await cancelReservationMutation.mutateAsync({ id: active.id });
            } catch (error) {
              toast.error(
                extractErrorMessage(error, "Failed to clear reservation"),
              );
            }
          })();
          break;
        case "serve":
          if (table.activeOrder) {
            orderStatusMutation.mutate(
              { id: table.activeOrder.orderId, status: OrderStatus.SERVED },
              {
                onError: (error) =>
                  toast.error(error.message || "Failed to mark as served"),
              },
            );
          }
          break;
        case "pay":
          if (table.activeOrder) {
            const remaining = Math.max(
              0,
              Number(table.activeOrder.total) - table.activeOrder.paidAmount,
            );
            openModal(
              "Take Payment",
              <TablePaymentForm
                orderId={table.activeOrder.orderId}
                total={remaining}
              />,
              `Table ${table.tableNumber}`,
            );
          }
          break;
        case "complete":
          if (table.activeOrder) {
            orderStatusMutation.mutate(
              { id: table.activeOrder.orderId, status: OrderStatus.COMPLETED },
              {
                onSuccess: () => {
                  // Close the tab in the cart if it's open
                  const activeTabId = useOrderStore.getState().activeTabId;
                  if (activeTabId) {
                    closeTab(activeTabId);
                  }

                  // Invalidate order queries to refresh UI
                  queryClient.invalidateQueries({ queryKey: ["orders"] });
                  queryClient.invalidateQueries({ queryKey: ["tables"] });

                  toast.success("Order completed, table freed");
                  selectTable(null);
                },
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
      cancelReservationMutation,
      closeModal,
      closeTab,
      deleteTableMutation,
      fetchTableReservation,
      freeTable,
      openModal,
      openTableOrder,
      orderStatusMutation,
      queryClient,
      renderDeleteConfirm,
      renderEditForm,
      renderFreeConfirm,
      renderReserveForm,
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
