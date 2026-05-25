import {
  useCancelPurchaseOrder,
  useReceivePurchaseOrder,
} from "@/hooks/usePurchaseOrder";
import type { PurchaseOrderSummary } from "@/dto/purchaseOrder.dto";
import { PurchaseOrderStatus } from "@repo/types";
import { Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";

export const PurchaseOrderActions = ({
  po,
}: {
  po: PurchaseOrderSummary;
}) => {
  const navigate = useNavigate();
  const receiveMutation = useReceivePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();

  const canReceive =
    po.status === PurchaseOrderStatus.PENDING ||
    po.status === PurchaseOrderStatus.ORDERED;
  const canCancel = canReceive;

  const handleReceive = async () => {
    if (
      window.confirm(
        "Mark this purchase order as received? This will update inventory."
      )
    ) {
      await receiveMutation.mutateAsync(po.id);
    }
  };

  const handleCancel = async () => {
    if (window.confirm("Are you sure you want to cancel this purchase order?")) {
      await cancelMutation.mutateAsync(po.id);
    }
  };

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger>
        <Icon name="Ellipsis" className="size-4" />
      </Shad.DropdownMenuTrigger>
      <Shad.DropdownMenuContent align="end">
        <Shad.DropdownMenuItem
          onClick={() => navigate({ to: `/purchase-orders/${po.id}` })}
        >
          <Icon name="Eye" className="h-4 w-4" />
          View Details
        </Shad.DropdownMenuItem>
        {canReceive && (
          <Shad.DropdownMenuItem onClick={handleReceive}>
            <Icon name="PackageCheck" className="h-4 w-4" />
            Mark as Received
          </Shad.DropdownMenuItem>
        )}
        {canCancel && (
          <Shad.DropdownMenuItem onClick={handleCancel} variant="destructive">
            <Icon name="X" className="h-4 w-4" />
            Cancel Order
          </Shad.DropdownMenuItem>
        )}
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
