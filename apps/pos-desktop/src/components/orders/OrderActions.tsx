import { Button, Icon } from "@repo/ui";
import { useOrderStore } from "@/store/orderStore";
import { cn } from "@repo/ui";
import { useState } from "react";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { PaymentDialog } from "./PaymentDialog";
import { SplitBillDialog } from "./SplitBillDialog";
import { HoldOrderDialog } from "./HoldOrderDialog";
import type { PaymentMethod } from "@repo/types";

interface OrderActionsProps {
  className?: string;
  onCompleteOrder?: () => void;
  onHoldOrder?: () => void;
  onSplitBill?: () => void;
  onConfirmWithoutPayment?: () => void;
}

export const OrderActions = ({
  className,
  onCompleteOrder,
  onHoldOrder,
  onSplitBill,
  onConfirmWithoutPayment,
}: OrderActionsProps) => {
  const {
    getActiveOrder,
    getActiveTab,
    getOrderTotal,
    setOrderStatus,
    clearOrder,
  } = useOrderStore();

  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [showSplitBillDialog, setShowSplitBillDialog] = useState(false);
  const [showConfirmWithoutPayDialog, setShowConfirmWithoutPayDialog] =
    useState(false);

  const order = getActiveOrder();
  const activeTab = getActiveTab();
  const total = getOrderTotal();
  const hasItems = order && order.items.length > 0;

  const canComplete = hasItems && total > 0;
  const canHold = hasItems && order?.status !== "ON_HOLD";
  const canSplitBill = hasItems && total > 0;
  const isOnHold = order?.status === "ON_HOLD";

  const handlePayConfirm = (
    _method: PaymentMethod,
    _amountTendered: number
  ) => {
    if (!canComplete) return;
    setOrderStatus("COMPLETED");
    clearOrder();
    onCompleteOrder?.();
  };

  const handleHoldConfirm = () => {
    if (!canHold) return;
    setOrderStatus("ON_HOLD");
    onHoldOrder?.();
  };

  const handleResumeOrder = () => {
    setOrderStatus("DRAFT");
  };

  const handleSplitBillConfirm = () => {
    onSplitBill?.();
    setShowSplitBillDialog(false);
  };

  const handleConfirmWithoutPaymentConfirm = () => {
    if (!canComplete) return;
    setOrderStatus("COMPLETED");
    clearOrder();
    onConfirmWithoutPayment?.();
  };

  return (
    <>
      <div className={cn("flex flex-col gap-3", className)}>
        {/* Primary Actions Row */}
        <div className="flex gap-2">
          <Button
            size="lg"
            className="flex-3 h-12"
            onClick={() => setShowPayDialog(true)}
            disabled={!canComplete}
          >
            <Icon name="CreditCard" className="w-5 h-5" />
            Pay
          </Button>
          {isOnHold ? (
            <Button
              variant="default"
              size="lg"
              className="h-12 bg-amber-500 hover:bg-amber-600"
              onClick={handleResumeOrder}
            >
              <Icon name="Play" className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="h-12"
              onClick={() => setShowHoldDialog(true)}
              disabled={!canHold}
            >
              <Icon name="CirclePause" className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Secondary Actions Row */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="default"
            className="flex-1"
            onClick={() => setShowSplitBillDialog(true)}
            disabled={!canSplitBill}
          >
            <Icon name="Split" className="w-4 h-4" />
            Split Bill
          </Button>
          <Button
            variant="ghost"
            size="default"
            className="flex-1"
            onClick={() => setShowConfirmWithoutPayDialog(true)}
            disabled={!canComplete}
          >
            <Icon name="Check" className="w-4 h-4" />
            Confirm Only
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={showPayDialog}
        onOpenChange={setShowPayDialog}
        total={total}
        onConfirm={handlePayConfirm}
      />

      {/* Hold Order Dialog */}
      <HoldOrderDialog
        open={showHoldDialog}
        onOpenChange={setShowHoldDialog}
        onConfirm={handleHoldConfirm}
        orderLabel={activeTab?.label}
      />

      {/* Split Bill Dialog */}
      <SplitBillDialog
        open={showSplitBillDialog}
        onOpenChange={setShowSplitBillDialog}
        total={total}
        onConfirm={handleSplitBillConfirm}
      />

      {/* Confirm Without Payment Dialog */}
      <ConfirmationDialog
        open={showConfirmWithoutPayDialog}
        onOpenChange={setShowConfirmWithoutPayDialog}
        title="Confirm Without Payment"
        description="This will confirm the order without processing any payment. The order will be marked as complete but no payment will be recorded. Use this for staff meals, comps, or manual payment processing."
        icon="CircleAlert"
        confirmLabel="Confirm Order"
        onConfirm={handleConfirmWithoutPaymentConfirm}
        variant="warning"
      />
    </>
  );
};
