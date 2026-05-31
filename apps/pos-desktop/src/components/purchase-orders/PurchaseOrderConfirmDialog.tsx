import {
  useCancelPurchaseOrder,
  useReceivePurchaseOrder,
} from "@/hooks/usePurchaseOrder";
import { PurchaseOrderStatus } from "@repo/types";
import { Shad } from "@repo/ui";
import { useState } from "react";

export type PurchaseOrderAction = "receive" | "cancel" | null;

/**
 * Hook for orchestrating the confirm-receive / confirm-cancel flows.
 * Tracks the pending action, exposes mutation state so the dialog can stay
 * open (and disabled) while the request is in flight, and centralises the
 * status-based capability checks so callers don't drift.
 */
export const usePurchaseOrderActions = (poStatus: string) => {
  const [pendingAction, setPendingAction] = useState<PurchaseOrderAction>(null);
  const receiveMutation = useReceivePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();

  const canReceive =
    poStatus === PurchaseOrderStatus.PENDING ||
    poStatus === PurchaseOrderStatus.ORDERED;
  const canCancel = canReceive;

  const isPending =
    pendingAction === "receive"
      ? receiveMutation.isPending
      : pendingAction === "cancel"
        ? cancelMutation.isPending
        : false;

  const confirm = async (poId: string) => {
    try {
      if (pendingAction === "receive") {
        await receiveMutation.mutateAsync(poId);
      } else if (pendingAction === "cancel") {
        await cancelMutation.mutateAsync(poId);
      }
      setPendingAction(null);
    } catch {
      // Keep the dialog open on failure so the user can retry — the
      // mutation hook already surfaces a toast via its onError handler.
    }
  };

  return {
    pendingAction,
    setPendingAction,
    canReceive,
    canCancel,
    isPending,
    confirm,
  };
};

type Props = {
  poId: string;
  pendingAction: PurchaseOrderAction;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (poId: string) => void;
};

export const PurchaseOrderConfirmDialog = ({
  poId,
  pendingAction,
  isPending,
  onCancel,
  onConfirm,
}: Props) => {
  const isReceive = pendingAction === "receive";

  return (
    <Shad.AlertDialog
      open={pendingAction !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel();
      }}
    >
      <Shad.AlertDialogContent>
        <Shad.AlertDialogHeader>
          <Shad.AlertDialogTitle>
            {isReceive ? "Mark as received?" : "Cancel purchase order?"}
          </Shad.AlertDialogTitle>
          <Shad.AlertDialogDescription>
            {isReceive
              ? "This will add the ordered quantities to inventory stock. This action cannot be undone."
              : "This will cancel the purchase order. Inventory will not be affected."}
          </Shad.AlertDialogDescription>
        </Shad.AlertDialogHeader>
        <Shad.AlertDialogFooter>
          <Shad.AlertDialogCancel disabled={isPending}>
            Cancel
          </Shad.AlertDialogCancel>
          <Shad.AlertDialogAction
            disabled={isPending}
            // Block the built-in auto-close so the dialog stays open while
            // the mutation runs. We close manually inside `confirm` after
            // success, and keep it open on failure for retry.
            onClick={(e) => {
              e.preventDefault();
              onConfirm(poId);
            }}
            className={
              !isReceive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {isPending
              ? "Processing..."
              : isReceive
                ? "Mark as Received"
                : "Cancel Order"}
          </Shad.AlertDialogAction>
        </Shad.AlertDialogFooter>
      </Shad.AlertDialogContent>
    </Shad.AlertDialog>
  );
};
