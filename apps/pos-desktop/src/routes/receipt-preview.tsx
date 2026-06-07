import { ReceiptPdf } from "@/components/receipt/ReceiptPdf";
import { useOrderStore } from "@/store/orderStore";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { Button, Icon, toast } from "@repo/ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/receipt-preview")({
  component: ReceiptPreviewPageComponent,
});

function ReceiptPreviewPageComponent() {
  const navigate = useNavigate();
  const lastCompletedOrder = useOrderStore((s) => s.lastCompletedOrder);
  const createTab = useOrderStore((s) => s.createTab);

  if (!lastCompletedOrder) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh] max-w-md mx-auto">
        <div className="bg-muted p-4 rounded-full mb-4 text-muted-foreground">
          <Icon name="Search" className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No Order Found</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          There are no recent checkout transactions to preview. Please return to
          the dashboard.
        </p>
        <Button onClick={() => navigate({ to: "/" })} className="h-10 px-6">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const {
    order,
    orderNumber,
    tenantName,
    branchName,
    branchAddress,
    branchPhone,
    loyaltyApplied,
  } = lastCompletedOrder;

  const handleNewOrder = () => {
    // Spawns a fresh tab and sets it active in the order tab system
    createTab();
    navigate({ to: "/" });
  };

  const handlePrint = async () => {
    try {
      const blob = await pdf(
        <ReceiptPdf
          order={order}
          tenantName={tenantName}
          branchName={branchName}
          branchAddress={branchAddress}
          branchPhone={branchPhone}
          orderNumber={orderNumber}
          loyaltyApplied={loyaltyApplied}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
    } catch (err) {
      toast.error("Failed to trigger printer.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Back to POS Navigation Link */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/" })}
          className="text-muted-foreground hover:text-white"
        >
          <Icon name="ArrowLeft" className="size-4 mr-2" />
          Back to Register
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================= LEFT SIDE: PDF RECEIPT VIEW ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* New Transaction / Back to Register CTA */}
          <div className="bg-card border rounded-lg p-6 shadow-md flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-semibold text-base">
                Ready for the Next Customer?
              </h3>
              <p className="text-xs text-muted-foreground">
                Spawn a new, empty order tab and navigate straight back to the
                register.
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleNewOrder}
              className="h-14 w-full sm:w-auto px-8 text-base font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 bg-primary text-primary-foreground hover:bg-primary/95"
            >
              <Icon name="Plus" className="size-5" />
              Start New Order
            </Button>
          </div>
        </div>

        {/* ================= RIGHT SIDE: ACTIONS & EMAIL DISPATCH ================= */}
        <div className="lg:col-span-5 w-full flex flex-col gap-4">
          <div className="w-full h-[480px] border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden shadow-2xl bg-muted/20 relative">
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              <ReceiptPdf
                order={order}
                tenantName={tenantName}
                branchName={branchName}
                branchAddress={branchAddress}
                branchPhone={branchPhone}
                orderNumber={orderNumber}
                loyaltyApplied={loyaltyApplied}
              />
            </PDFViewer>
          </div>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="h-11 flex items-center justify-center gap-2 font-semibold shadow-md active:scale-98 transition-all"
          >
            <Icon name="Printer" className="size-4" />
            Print Physical Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}
