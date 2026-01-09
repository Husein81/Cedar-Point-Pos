import { useOrderStore } from "@/store/orderStore";
import type { PaymentMethod } from "@repo/types";
import { Button, cn, Icon } from "@repo/ui";
import { useState } from "react";
import AlertDialog from "../common/AlertDialog";
import { PaymentForm } from "./PaymentForm";
import { SplitBillForm } from "./SplitBillForm";
import { useModalStore } from "@/store/modalStore";

type Props = {
  className?: string;
  onCompleteOrder?: () => void;
  onHoldOrder?: () => void;
  onSplitBill?: () => void;
  onConfirmWithoutPayment?: () => void;
};

export const OrderActions = ({
  className,
  onCompleteOrder,
  onHoldOrder,
  onSplitBill,
  onConfirmWithoutPayment,
}: Props) => {
  const { openModal, closeModal } = useModalStore();
  const { getActiveOrder, getOrderTotal, setOrderStatus, clearOrder } =
    useOrderStore();

  const order = getActiveOrder();
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
    closeModal();
  };

  const handleConfirmWithoutPaymentConfirm = () => {
    if (!canComplete) return;
    setOrderStatus("COMPLETED");
    clearOrder();
    onConfirmWithoutPayment?.();
  };

  const handlePay = () => {
    openModal(
      "Payment Form",
      <PaymentForm total={total} onConfirm={handlePayConfirm} />
    );
  };

  const handleSplitBill = () => {
    openModal(
      "Split Bill",
      <SplitBillForm total={total} onConfirm={handleSplitBillConfirm} />
    );
  };
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Primary Actions Row */}
      <div className="flex gap-2">
        <Button
          size="lg"
          className="flex-3"
          onClick={handlePay}
          disabled={!canComplete}
        >
          <Icon name="CreditCard" className="w-4 h-4" />
          Pay
        </Button>
        {isOnHold ? (
          <Button
            variant="default"
            size="lg"
            className="bg-amber-500 hover:bg-amber-600"
            onClick={handleResumeOrder}
          >
            <Icon name="Play" className="w-4 h-4" />
          </Button>
        ) : (
          <AlertDialog
            iconButton="CirclePause"
            size="lg"
            variant="warning"
            title="Hold Order"
            description="Are you sure you want to put this order on hold? You can resume it later."
            section={
              <div className="space-y-4 pt-2">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex gap-3">
                    <Icon
                      name="Info"
                      className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
                    />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">
                        What happens when you hold an order:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>
                          The order will be saved and moved to a held state
                        </li>
                        <li>You can resume it anytime from the order tabs</li>
                        <li>All items and discounts will be preserved</li>
                        <li>
                          The held order tab will show a
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                            Hold
                          </span>
                          badge
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            }
            confirmText="Hold Order"
            onConfirm={handleHoldConfirm}
          />
        )}
      </div>

      {/* Secondary Actions Row */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="default"
          className="flex-1"
          onClick={handleSplitBill}
          disabled={!canSplitBill}
        >
          <Icon name="Split" className="w-4 h-4" />
          Split Bill
        </Button>

        <AlertDialog
          title="Confirm Without Payment"
          description="This will confirm the order without processing any payment. The order will be marked as complete but no payment will be recorded. Use this for staff meals, comps, or manual payment processing."
          label="Confirm Only"
          iconButton="Check"
          onConfirm={handleConfirmWithoutPaymentConfirm}
          variant="warning"
          buttonVariant="ghost"
        />
      </div>
    </div>
  );
};
