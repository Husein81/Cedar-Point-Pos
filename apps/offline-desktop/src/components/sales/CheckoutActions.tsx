import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { useCheckout } from "@/hooks/useOrder";
import { useSettings } from "@/hooks/useSettings";
import { Button, Icon } from "@repo/ui";
import { formatMoney } from "@/utils/format";
import { printReceipt } from "@/utils/receipt";
import { PaymentForm, type PaymentEntry } from "./PaymentForm";

type Props = {
  currencySymbol: string;
  taxRate: number;
};

export default function CheckoutActions({ currencySymbol, taxRate }: Props) {
  const { openModal, closeModal } = useModalStore();
  const { getActiveOrder, getOrderSubtotal, getDiscountAmount, clearOrder } =
    useOrderStore();
  const checkout = useCheckout();
  const { data: settings } = useSettings();

  const order = getActiveOrder();
  const subtotal = getOrderSubtotal();
  const discount = getDiscountAmount();
  const taxable = Math.max(0, subtotal - discount);
  const total = taxable + taxable * taxRate;

  const hasItems = !!order?.items?.length;

  const handleConfirm = async (payments: PaymentEntry[]) => {
    if (!order) return;

    const completedOrder = await checkout.mutateAsync({
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        discountType: item.discount?.type ?? null,
        discountValue: item.discount?.value ?? 0,
        note: item.notes ?? null,
      })),
      payments: payments.map((p) => ({ method: p.method, amount: p.amount })),
      customerId: order.customerId,
      discountType: order.discount?.type ?? null,
      discountValue: order.discount?.value ?? 0,
      note: null,
      heldOrderId: null,
    });

    clearOrder();
    closeModal();

    if (settings) {
      printReceipt(completedOrder, settings);
    }
  };

  const handlePay = () => {
    openModal(
      "Payment",
      <PaymentForm
        total={total}
        currencySymbol={currencySymbol}
        onConfirm={handleConfirm}
      />,
    );
  };

  const payDisabled = !hasItems || total <= 0;

  return (
    <div className="flex items-stretch gap-1.5 border-t border-border bg-background p-2">
      <Button
        size="lg"
        className="h-12 flex-[1.6] rounded-lg text-sm font-semibold shadow-sm transition-transform active:scale-[0.98]"
        disabled={payDisabled}
        onClick={handlePay}
      >
        <Icon name="CreditCard" className="mr-1.5 h-5 w-5" />
        Pay
        {!payDisabled && (
          <span className="ml-1.5 tabular-nums opacity-90">
            {formatMoney(total, currencySymbol)}
          </span>
        )}
      </Button>
    </div>
  );
}
