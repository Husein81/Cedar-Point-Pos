import { useMergeOrders } from "@/hooks/useOrder";
import { useOrderStore } from "@/store/orderStore";
import { useModalStore } from "@/store/modalStore";
import { toast } from "@repo/ui";
import MergeTargetSelector from "./MergeTargetSelector";

export function MergeOrderModal() {
  const { closeModal } = useModalStore();
  const { getActiveOrder, loadOrder } = useOrderStore();
  const order = getActiveOrder();
  const mergeMutation = useMergeOrders();

  if (!order || !order.tableId) return null;

  const handleMerge = (targetOrderId: string) => {
    mergeMutation.mutate(
      { targetOrderId, sourceOrderId: order.id },
      {
        onSuccess: (mergedOrder) => {
          loadOrder(mergedOrder as any, true);
          toast.success("Orders merged successfully");
          closeModal();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to merge orders");
        },
      },
    );
  };

  return (
    <div className="p-4 pt-0">
      <p className="text-xs text-muted-foreground mb-4">
        Select the target order to merge <strong>this</strong> order into. This
        order will be cancelled and its items moved.
      </p>
      <MergeTargetSelector
        activeOrderIds={[order.id]}
        tableId={order.tableId}
        onSelect={handleMerge}
        onCancel={closeModal}
        isPending={mergeMutation.isPending}
      />
    </div>
  );
}
