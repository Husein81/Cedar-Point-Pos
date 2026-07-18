import { PaymentForm, type PaymentEntry } from "@/components/orders/PaymentForm";
import { useProcessPayment } from "@/hooks/useOrder";
import { useModalStore } from "@/store/modalStore";
import { toast } from "@repo/ui";
import { extractErrorMessage } from "@/utils/error";

interface TablePaymentFormProps {
  orderId: string;
  total: number;
}

/**
 * Payment entry for a table's order, launched from the table drawer/quick
 * actions. Unlike the main checkout flow (useOrderActions.handlePaymentConfirm),
 * this order already exists server-side, so it talks to useProcessPayment
 * directly instead of routing through the cart/tab store.
 */
export const TablePaymentForm = ({ orderId, total }: TablePaymentFormProps) => {
  const processPayment = useProcessPayment();
  const closeModal = useModalStore((s) => s.closeModal);

  const handleConfirm = async (payments: PaymentEntry[]) => {
    if (payments.length === 0) return;
    try {
      await processPayment.mutateAsync({
        id: orderId,
        payments: payments.map((p) => ({
          amount: p.amount,
          method: p.method,
          currencyCode: p.currencyCode,
          exchangeRate: p.exchangeRate,
        })),
      });
      toast.success("Payment recorded");
      closeModal();
    } catch (error) {
      toast.error(extractErrorMessage(error, "Payment failed"));
    }
  };

  return <PaymentForm total={total} onConfirm={handleConfirm} />;
};
