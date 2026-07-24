import { PDFViewer } from "@react-pdf/renderer";
import { ReceiptPdf, printReceipt } from "@/components/receipt/ReceiptPdf";
import { Button, Icon, toast } from "@repo/ui";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { useAuthStore } from "@/store/authStore";
import { mapBackendOrderToClientOrder } from "@/utils/orderMapper";
import type { Order } from "@repo/types";
import { BackendOrder } from "@/dto/order.dto";

interface ReceiptPreviewModalProps {
  order: Order;
  tenantName: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  orderNumber: string;
  loyaltyApplied?: {
    points: number;
    discount: number;
  };
}

export function ReceiptPreviewModal({
  order,
  tenantName,
  branchName,
  branchAddress,
  branchPhone,
  orderNumber,
  loyaltyApplied,
}: ReceiptPreviewModalProps) {
  const clientOrder = mapBackendOrderToClientOrder(order as BackendOrder);
  const { data: currencyData } = useTenantCurrencies();
  const tenantCurrencies = currencyData?.currencies ?? [];
  const baseCurrencyCode = currencyData?.baseCurrencyCode ?? "USD";
  const logoUrl = useAuthStore((s) => s.user?.tenant?.logoUrl);

  const handlePrint = async () => {
    try {
      await printReceipt({
        order: clientOrder,
        tenantName,
        branchName,
        branchAddress,
        branchPhone,
        orderNumber,
        loyaltyApplied,
        tenantCurrencies,
        baseCurrencyCode,
        logoUrl,
      });
      toast.success("Sent to printer.");
    } catch (err) {
      toast.error("Failed to print receipt.");
    }
  };

  return (
    <div className="space-y-4 p-4 flex flex-col items-center">
      <div className="w-full h-[520px] border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden shadow-2xl bg-muted/20 relative">
        <PDFViewer width="100%" height="100%" showToolbar={false}>
          <ReceiptPdf
            order={clientOrder}
            tenantName={tenantName}
            branchName={branchName}
            branchAddress={branchAddress}
            branchPhone={branchPhone}
            orderNumber={orderNumber}
            loyaltyApplied={loyaltyApplied}
            tenantCurrencies={tenantCurrencies}
            baseCurrencyCode={baseCurrencyCode}
            logoUrl={logoUrl}
          />
        </PDFViewer>
      </div>
      <Button
        onClick={handlePrint}
        className="w-full h-11 flex items-center justify-center gap-2 font-semibold shadow-md active:scale-98 transition-all"
      >
        <Icon name="Printer" className="size-4" />
        Print Physical Receipt
      </Button>
    </div>
  );
}
