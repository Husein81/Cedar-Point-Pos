import {
  useCancelPurchaseOrder,
  useOrderPurchaseOrder,
  useReceivePurchaseOrder,
} from "@/hooks/usePurchaseOrder";
import type { PurchaseOrderSummary } from "@/dto/purchaseOrder.dto";
import { PurchaseOrderStatus } from "@repo/types";
import { Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseOrderActionsProps {
  order: PurchaseOrderSummary;
}

// ─── Transition rules (Single Source of Truth) ────────────────────────────────

const canPlaceOrder = (status: string) =>
  status === PurchaseOrderStatus.PENDING;

const canReceive = (status: string) => status === PurchaseOrderStatus.ORDERED;

const canCancel = (status: string) =>
  status === PurchaseOrderStatus.PENDING ||
  status === PurchaseOrderStatus.ORDERED;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Row-level action menu for a Purchase Order list entry.
 *
 * Responsibilities:
 *  - Navigate to the PO detail page
 *  - Trigger status transitions (PENDING→ORDERED, ORDERED→RECEIVED, cancel)
 *
 * Each transition is only shown when the current status allows it,
 * enforcing the same lifecycle rules as the backend.
 */
export const PurchaseOrderActions = ({ order }: PurchaseOrderActionsProps) => {
  const navigate = useNavigate();
  const placeMutation = useOrderPurchaseOrder();
  const receiveMutation = useReceivePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();

  const isAnyPending =
    placeMutation.isPending ||
    receiveMutation.isPending ||
    cancelMutation.isPending;

  const handleViewDetails = () => {
    navigate({
      to: "/purchase-orders/$purchaseOrderId",
      params: { purchaseOrderId: order.id },
    });
  };

  const handlePlaceOrder = async () => {
    try {
      await placeMutation.mutateAsync(order.id);
      toast.success(`Order #${order.orderNumber ?? order.id.slice(0, 8)} placed`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to place order";
      toast.error(message);
    }
  };

  const handleReceive = async () => {
    try {
      await receiveMutation.mutateAsync(order.id);
      toast.success(
        `Order #${order.orderNumber ?? order.id.slice(0, 8)} marked as received`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to receive order";
      toast.error(message);
    }
  };

  const handleCancel = async () => {
    const label = order.orderNumber ?? order.id.slice(0, 8);
    if (!window.confirm(`Cancel order #${label}? This cannot be undone.`)) {
      return;
    }
    try {
      await cancelMutation.mutateAsync(order.id);
      toast.success(`Order #${label} cancelled`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel order";
      toast.error(message);
    }
  };

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger asChild disabled={isAnyPending}>
        <button
          aria-label="Order actions"
          className="flex items-center justify-center rounded-md p-1 hover:bg-muted disabled:opacity-50"
        >
          <Icon name="Ellipsis" className="size-4" />
        </button>
      </Shad.DropdownMenuTrigger>

      <Shad.DropdownMenuContent align="end" className="w-48">
        {/* ── Navigation ─────────────────────────────── */}
        <Shad.DropdownMenuItem onClick={handleViewDetails}>
          <Icon name="Eye" className="size-4" />
          View Details
        </Shad.DropdownMenuItem>

        {/* ── Status transitions ──────────────────────── */}
        {(canPlaceOrder(order.status) ||
          canReceive(order.status) ||
          canCancel(order.status)) && (
          <>
            <Shad.DropdownMenuSeparator />
            <Shad.DropdownMenuLabel className="text-xs text-muted-foreground">
              Change Status
            </Shad.DropdownMenuLabel>

            {canPlaceOrder(order.status) && (
              <Shad.DropdownMenuItem
                onClick={handlePlaceOrder}
                disabled={placeMutation.isPending}
              >
                <Icon name="SendHorizontal" className="size-4" />
                Place Order
              </Shad.DropdownMenuItem>
            )}

            {canReceive(order.status) && (
              <Shad.DropdownMenuItem
                onClick={handleReceive}
                disabled={receiveMutation.isPending}
              >
                <Icon name="PackageCheck" className="size-4" />
                Mark Received
              </Shad.DropdownMenuItem>
            )}

            {canCancel(order.status) && (
              <Shad.DropdownMenuItem
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                variant="destructive"
              >
                <Icon name="Ban" className="size-4" />
                Cancel Order
              </Shad.DropdownMenuItem>
            )}
          </>
        )}
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
