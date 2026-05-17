import { AlertDialog } from "@/components/common";
import { PaymentForm } from "@/components/orders/PaymentForm";
import { useOrderActions } from "@/hooks/useOrderActions";
import {
  useCustomerLoyaltyAccount,
  useLoyaltyProgram,
} from "@/hooks/useLoyalty";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import { BusinessType, OrderType } from "@repo/types";
import { Button, Icon } from "@repo/ui";
import { useShallow } from "zustand/react/shallow";
import { useMemo } from "react";
import { SplitBillForm } from "@/components/orders/SplitBillForm";
import type { PaymentEntry } from "@/components/orders/PaymentForm";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { useOrderStore } from "@/store/orderStore";
import { ReceiptModal } from "@/components/orders/ReceiptModal";

export default function KeypadActions() {
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

  const { data: currenciesData } = useTenantCurrencies();
  const baseCurrencyCode = currenciesData?.baseCurrencyCode || "USD";

  const handlePay = () => {
    openModal(
      "Payment Form",
      <PaymentForm
        total={remainingTotal}
        onConfirm={handlePaymentConfirm}
        loyaltyProgram={loyaltyProgram}
        loyaltyAccount={loyaltyAccount}
        customerId={order?.customerId}
        eligibleBase={loyaltyEligibleBase}
      />,
    );
  };

  const handleSplitBill = () => {
    openModal(
      "Split Bill",
      <SplitBillForm
        total={remainingTotal}
        onConfirm={(splits) => {
          const payments: PaymentEntry[] = splits.map((s) => ({
            id: crypto.randomUUID(),
            method: s.method,
            amount: s.amount,
            currencyCode: baseCurrencyCode,
            exchangeRate: 1,
            amountInBase: s.amount,
          }));
          handlePaymentConfirm(payments);
        }}
      />,
    );
  };

  const handlePrintReceipt = () => {
    openModal("Receipt Preview", <ReceiptModal />);
  };

  return (
    <div className="flex items-center border-t border-border p-2 gap-2">
      <Button
        size="lg"
        className="h-12 text-sm font-semibold"
        disabled={
          !order?.items?.length ||
          remainingTotal <= 0 ||
          deliveryNeedsCustomer ||
          deliveryNeedsAddress
        }
        onClick={handlePay}
      >
        <Icon name="CreditCard" className="w-5 h-5 mr-2" />
        Payment
      </Button>

      <Button
        size="lg"
        variant="outline"
        className="px-4 h-12"
        disabled={!order?.items?.length}
        onClick={handlePrintReceipt}
      >
        <Icon name="Printer" className="w-5 h-5" />
      </Button>

      <Button
        size="lg"
        variant="outline"
        className="px-4 h-12"
        disabled={
          !order?.items?.length ||
          remainingTotal <= 0 ||
          deliveryNeedsCustomer ||
          deliveryNeedsAddress
        }
        onClick={handleSplitBill}
      >
        <Icon name="Scissors" className="w-5 h-5" />
      </Button>

      {isRestaurant ? (
        <Button
          size="lg"
          variant="outline"
          className="h-12 text-sm font-semibold"
          disabled={
            !order?.items?.length ||
            deliveryNeedsCustomer ||
            deliveryNeedsAddress
          }
          onClick={handleSendToKitchen}
        >
          Send to Kitchen
          {hasUnsentItems && (
            <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
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
          className="h-12 text-sm font-semibold"
          disabled={
            !order?.items?.length ||
            total <= 0 ||
            deliveryNeedsCustomer ||
            deliveryNeedsAddress
          }
        />
      )}
    </div>
  );
}
