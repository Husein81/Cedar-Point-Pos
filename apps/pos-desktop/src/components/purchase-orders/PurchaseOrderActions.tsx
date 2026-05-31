import type { PurchaseOrderSummary } from "@/dto/purchaseOrder.dto";
import { Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import {
  PurchaseOrderConfirmDialog,
  usePurchaseOrderActions,
} from "./PurchaseOrderConfirmDialog";

export const PurchaseOrderActions = ({
  po,
}: {
  po: PurchaseOrderSummary;
}) => {
  const navigate = useNavigate();
  const {
    pendingAction,
    setPendingAction,
    canReceive,
    canCancel,
    isPending,
    confirm,
  } = usePurchaseOrderActions(po.status);

  return (
    <>
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
            <Shad.DropdownMenuItem onClick={() => setPendingAction("receive")}>
              <Icon name="PackageCheck" className="h-4 w-4" />
              Mark as Received
            </Shad.DropdownMenuItem>
          )}
          {canCancel && (
            <Shad.DropdownMenuItem
              onClick={() => setPendingAction("cancel")}
              variant="destructive"
            >
              <Icon name="X" className="h-4 w-4" />
              Cancel Order
            </Shad.DropdownMenuItem>
          )}
        </Shad.DropdownMenuContent>
      </Shad.DropdownMenu>

      <PurchaseOrderConfirmDialog
        poId={po.id}
        pendingAction={pendingAction}
        isPending={isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirm}
      />
    </>
  );
};
