import { AlertDialog } from "@/components/common";
import { PaymentForm } from "@/components/orders/PaymentForm";
import { useNetworkStatus } from "@/context/NetworkContext";
import {
  useCustomerLoyaltyAccount,
  useLoyaltyProgram,
} from "@/hooks/useLoyalty";
import { useOrderActions } from "@/hooks/useOrderActions";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { BusinessType, OrderType } from "@repo/types";
import { Button, Icon, Shad } from "@repo/ui";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { formatPrice } from "./config";
import OtherActions from "./Keypad/OtherActions";

/** Persistent checkout bar — Pay, Send to Kitchen / Confirm, and secondary actions. */
export default function CheckoutActions() {
  const { openModal } = useModalStore();
  const { order, subtotalValue, discountValue, vatValue } = useOrderStore(
    useShallow((s) => {
      const activeOrder = s.getActiveOrder();
      return {
        order: activeOrder,
        subtotalValue: s.getOrderSubtotal(),
        discountValue: s.getDiscountAmount(),
        vatValue: s.getVATAmount(),
      };
    }),
  );

  const unsentItems = useMemo(() => {
    return order?.items.filter((i) => !i.sentToKitchen) || [];
  }, [order?.items]);

  const { user } = useAuthStore();
  const { isOnline } = useNetworkStatus();

  const {
    handlePaymentConfirm,
    handleConfirmWithoutPayment,
    handleSendToKitchen,
  } = useOrderActions();

  const shippingFee = order?.shippingFee ?? 0;
  const total = subtotalValue - discountValue + shippingFee + vatValue;
  const paidAmount = order?.paidAmount ?? 0;
  const remainingTotal = Math.max(0, total - paidAmount);
  const hasUnsentItems = unsentItems.length > 0;
  const hasItems = !!order?.items?.length;

  const isRestaurant = user?.tenant?.businessType === BusinessType.RESTAURANT;
  const deliveryNeedsCustomer =
    order?.type === OrderType.DELIVERY && !order?.customerId;
  const deliveryNeedsAddress =
    order?.type === OrderType.DELIVERY &&
    !!order?.customerId &&
    !order?.customerAddress;

  const { data: loyaltyProgram } = useLoyaltyProgram();
  const { data: loyaltyAccount } = useCustomerLoyaltyAccount(
    order?.customerId ?? null,
  );
  const loyaltyEligibleBase = Math.max(0, subtotalValue - discountValue);

  const handlePay = () => {
    openModal(
      "Payment Form",
      <PaymentForm
        total={remainingTotal}
        onConfirm={handlePaymentConfirm}
        loyaltyProgram={isOnline ? loyaltyProgram : undefined}
        loyaltyAccount={isOnline ? loyaltyAccount : undefined}
        customerId={order?.customerId}
        eligibleBase={loyaltyEligibleBase}
        offlineMode={!isOnline}
      />,
    );
  };

  const handleOpenMoreActions = () => {
    openModal("Actions", <OtherActions />);
  };

  const payDisabled =
    !hasItems ||
    remainingTotal <= 0 ||
    deliveryNeedsCustomer ||
    deliveryNeedsAddress;

  return (
    <div className="flex items-stretch gap-1.5 border-t border-border bg-background p-2">
      {/* Pay — primary action, shows the live amount due */}
      <Button
        size="lg"
        className="h-12 flex-[1.6] rounded-lg text-sm font-semibold shadow-sm transition-transform active:scale-[0.98]"
        disabled={payDisabled}
        onClick={handlePay}
      >
        <Icon name="CreditCard" className="mr-1.5 h-5 w-5" />
        {!isOnline ? "Pay Cash" : "Pay"}
        {!payDisabled && (
          <span className="ml-1.5 tabular-nums opacity-90">
            ${formatPrice(remainingTotal)}
          </span>
        )}
      </Button>

      {isRestaurant ? (
        <Button
          size="lg"
          variant="outline"
          className="relative h-12 flex-1 rounded-lg text-sm font-semibold transition-transform active:scale-[0.98]"
          disabled={
            !hasItems ||
            deliveryNeedsCustomer ||
            deliveryNeedsAddress ||
            !isOnline
          }
          onClick={handleSendToKitchen}
        >
          {!isOnline && <Icon name="WifiOff" className="mr-1 h-4 w-4" />}
          <Icon name="ChefHat" className="mr-1 h-4 w-4" />
          Kitchen
          {hasUnsentItems && isOnline && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unsentItems.length}
            </span>
          )}
        </Button>
      ) : (
        <AlertDialog
          title="Confirm Order Without Payment"
          description="Are you sure you want to confirm this order without processing a payment? This action cannot be undone."
          onConfirm={handleConfirmWithoutPayment}
          iconButton="Check"
          buttonVariant="outline"
          label="Confirm"
          size="lg"
          className="h-12 flex-1 rounded-lg text-sm font-semibold"
          disabled={
            !hasItems ||
            total <= 0 ||
            deliveryNeedsCustomer ||
            deliveryNeedsAddress
          }
        />
      )}

      <Shad.Tooltip>
        <Shad.TooltipTrigger asChild>
          <Button
            onClick={handleOpenMoreActions}
            variant="outline"
            size="lg"
            aria-label="More actions"
            className="h-12 w-12 shrink-0 rounded-lg p-0 transition-transform active:scale-[0.98]"
          >
            <Icon name="EllipsisVertical" className="h-5 w-5" />
          </Button>
        </Shad.TooltipTrigger>
        <Shad.TooltipContent side="top">
          Split, transfer, print & more
        </Shad.TooltipContent>
      </Shad.Tooltip>
    </div>
  );
}
