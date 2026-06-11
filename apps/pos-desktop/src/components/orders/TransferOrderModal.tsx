import type { TableWithFloor } from "@/dto/tables.dto";
import { useTransferOrder } from "@/hooks/useOrder";
import { useOrderStore } from "@/store/orderStore";
import { useModalStore } from "@/store/modalStore";
import { toast } from "@repo/ui";
import { useState } from "react";
import { TableSelectorModal } from "./TableSelectorModal";
import { TransferMergeView } from "./TransferMergeView";

export function TransferOrderModal() {
  const { closeModal } = useModalStore();
  const { getActiveOrder, loadOrder } = useOrderStore();
  const order = getActiveOrder();
  const transferMutation = useTransferOrder();
  
  const [transferTargetTable, setTransferTargetTable] = useState<TableWithFloor | null>(null);

  if (!order) return null;

  const handleTransfer = (targetTable: TableWithFloor) => {
    transferMutation.mutate(
      { orderId: order.id, targetTableId: targetTable.id },
      {
        onSuccess: (transferredOrder) => {
          loadOrder(transferredOrder as any, true);
          toast.success("Order transferred successfully");
          closeModal();
        },
        onError: (err: any) => {
          const data = err?.response?.data;
          if (data?.code === "TABLE_HAS_ACTIVE_ORDER") {
            setTransferTargetTable(targetTable);
            return;
          }
          toast.error(data?.message || "Failed to transfer order");
        },
      }
    );
  };

  const handleTransferAndMerge = (targetMergeOrderId: string) => {
    if (!transferTargetTable) return;

    transferMutation.mutate(
      {
        orderId: order.id,
        targetTableId: transferTargetTable.id,
        mergeIntoOrderId: targetMergeOrderId,
      },
      {
        onSuccess: (mergedOrder) => {
          loadOrder(mergedOrder as any, true);
          toast.success("Order transferred and merged successfully");
          closeModal();
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || "Failed to transfer and merge order"
          );
        },
      }
    );
  };

  if (transferTargetTable) {
    return (
      <div className="p-4 pt-0">
        <TransferMergeView
          transferTargetTable={transferTargetTable}
          onMerge={handleTransferAndMerge}
          isPending={transferMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <TableSelectorModal 
        onTableSelect={handleTransfer} 
        currentTableId={order.tableId} 
      />
    </div>
  );
}
