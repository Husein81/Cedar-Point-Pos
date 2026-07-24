import {
  PaymentForm,
  type PaymentEntry,
} from "@/components/orders/PaymentForm";
import { printReceipt } from "@/components/receipt/ReceiptPdf";
import { useFetchOrder } from "@/hooks/useOrder";
import { useProcessPayment } from "@/hooks/useOrder";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { toast } from "@repo/ui";
import { extractErrorMessage } from "@/utils/error";
import { useBranch } from "@/hooks/useBranch";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { useAuthStore } from "@/store/authStore";
import { BackendOrder } from "@/dto/order.dto";
import { mapBackendOrderToClientOrder } from "@/utils/orderMapper";

interface TablePaymentFormProps {
  orderId: string;
  total: number;
}

export const TablePaymentForm = ({ orderId, total }: TablePaymentFormProps) => {
  const processPayment = useProcessPayment();
  const fetchOrder = useFetchOrder();
  const closeModal = useModalStore((s) => s.closeModal);
  const { branchId } = useBranchStore();
  const { user } = useAuthStore();

  const { data: currentBranch } = useBranch(branchId || "");
  const { data: currencyData } = useTenantCurrencies();
  const tenantCurrencies = currencyData?.currencies ?? [];
  const baseCurrencyCode = currencyData?.baseCurrencyCode ?? "USD";

  const handlePrintReceipt = async () => {
    try {
      const order = await fetchOrder(orderId);
      if (order && currentBranch) {
        // findOne returns the raw order; map it to the client shape the
        // receipt renderer expects (item.name / item.price).
        const clientOrder = mapBackendOrderToClientOrder(
          order as unknown as BackendOrder,
        );
        await printReceipt({
          order: clientOrder,
          tenantName: user?.tenant?.name || "Receipt",
          branchName: currentBranch.name,
          branchAddress: currentBranch.address || "",
          orderNumber: order.orderNumber || order.id,
          tenantCurrencies,
          baseCurrencyCode,
          logoUrl: user?.tenant?.logoUrl,
        });
      }
    } catch (printError) {
      console.error("Failed to print receipt:", printError);
      toast.error("Payment recorded but receipt printing failed");
    }
  };

  const handleConfirm = async (payments: PaymentEntry[]) => {
    // An empty batch is legitimate when the order owes nothing (fully
    // discounted); the server settles it without writing a payment row.
    if (payments.length === 0 && total > 0) return;
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

      await handlePrintReceipt();

      closeModal();
    } catch (error) {
      toast.error(extractErrorMessage(error, "Payment failed"));
    }
  };

  return <PaymentForm total={total} onConfirm={handleConfirm} />;
};
