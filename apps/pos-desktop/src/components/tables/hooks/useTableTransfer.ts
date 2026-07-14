import { useCallback, useEffect } from "react";
import { toast } from "@repo/ui";
import type { TableOverview } from "@/dto/tables.dto";
import { useTableSelectorTransferOrder } from "@/hooks/useOrder";
import { useModalStore } from "@/store/modalStore";
import { getTableDisplayName } from "../config";

export interface TableTransferApi {
  startTransfer: (table: TableOverview) => void;
  isTransferPending: boolean;
}

/**
 * The table-to-table order transfer flow, including the merge-conflict
 * detour: if the target table already has an active order, a merge selector
 * takes over before the transfer is retried with `mergeIntoOrderId`.
 */
export const useTableTransfer = (options: {
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
}): TableTransferApi => {
  const { renderTransferPicker, renderMergeSelector } = options;

  const { openModal, closeModal } = useModalStore();
  const transferOrder = useTableSelectorTransferOrder();

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

  return { startTransfer, isTransferPending: transferOrder.isPending };
};
