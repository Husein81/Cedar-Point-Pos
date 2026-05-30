import {
  useCancelPurchaseOrder,
  useReceivePurchaseOrder,
} from "@/hooks/usePurchaseOrder";
import type { PurchaseOrderSummary } from "@/dto/purchaseOrder.dto";
import { PurchaseOrderStatus } from "@repo/types";
import { Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

type PendingAction = "receive" | "cancel" | null;

export const PurchaseOrderActions = ({
  po,
}: {
  po: PurchaseOrderSummary;
}) => {
  const navigate = useNavigate();
  const receiveMutation = useReceivePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const canReceive =
    po.status === PurchaseOrderStatus.PENDING ||
    po.status === PurchaseOrderStatus.ORDERED;
  const canCancel = canReceive;

  const handleConfirm = async () => {
    if (pendingAction === "receive") {
      await receiveMutation.mutateAsync(po.id);
    } else if (pendingAction === "cancel") {
      await cancelMutation.mutateAsync(po.id);
    }
    setPendingAction(null);
  };

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

      <Shad.AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <Shad.AlertDialogContent>
          <Shad.AlertDialogHeader>
            <Shad.AlertDialogTitle>
              {pendingAction === "receive"
                ? "Mark as received?"
                : "Cancel purchase order?"}
            </Shad.AlertDialogTitle>
            <Shad.AlertDialogDescription>
              {pendingAction === "receive"
                ? "This will add the ordered quantities to inventory stock. This action cannot be undone."
                : "This will cancel the purchase order. Inventory will not be affected."}
            </Shad.AlertDialogDescription>
          </Shad.AlertDialogHeader>
          <Shad.AlertDialogFooter>
            <Shad.AlertDialogCancel>Cancel</Shad.AlertDialogCancel>
            <Shad.AlertDialogAction
              onClick={handleConfirm}
              className={
                pendingAction === "cancel"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {pendingAction === "receive" ? "Mark as Received" : "Cancel Order"}
            </Shad.AlertDialogAction>
          </Shad.AlertDialogFooter>
        </Shad.AlertDialogContent>
      </Shad.AlertDialog>
    </>
  );
};
