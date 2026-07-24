import { ReceiptPdf } from "@/components/receipt/ReceiptPdf";
import { useBranch } from "@/hooks/useBranch";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { useNextOrderNumber } from "@/hooks/useOrder";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { useOrderStore } from "@/store/orderStore";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { Button, Icon } from "@repo/ui";

import { useEffect, useState } from "react";

interface Props {
  loyaltyApplied?: {
    points: number;
    discount: number;
  };
}

export const ReceiptModal = ({ loyaltyApplied }: Props) => {
  const { getActiveOrder } = useOrderStore();
  const { user } = useAuthStore();
  const { branchId } = useBranchStore();
  const { data: branch, isLoading: isBranchLoading } = useBranch(
    branchId || "",
  );

  const order = getActiveOrder();
  const { data: currencyData } = useTenantCurrencies();
  const tenantCurrencies = currencyData?.currencies ?? [];
  const baseCurrencyCode = currencyData?.baseCurrencyCode ?? "USD";
  const { data: nextNumberData, isLoading: isNextNumberLoading } =
    useNextOrderNumber(branchId!);

  const orderNumber =
    order?.orderNumber || nextNumberData?.orderNumber || "PREVIEW";

  const isDataLoading = isBranchLoading || (branchId && isNextNumberLoading);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isDataLoading) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isDataLoading]);

  if (!order || !user) {
    return (
      <div className="flex items-center justify-center p-10">
        <p className="text-muted-foreground">Order or user not found</p>
      </div>
    );
  }

  const handlePrint = async () => {
    const blob = await pdf(
      <ReceiptPdf
        order={order}
        tenantName={user.tenant?.name || "Cedar Point"}
        branchName={branch?.name || "Main Branch"}
        branchAddress={branch?.address || ""}
        branchPhone={branch?.phone || ""}
        orderNumber={orderNumber}
        loyaltyApplied={loyaltyApplied}
        tenantCurrencies={tenantCurrencies}
        baseCurrencyCode={baseCurrencyCode}
        logoUrl={user.tenant?.logoUrl}
      />,
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.contentWindow?.print();
  };

  return (
    <div className="flex flex-col gap-4 h-[75vh]">
      <div className="flex-1 overflow-hidden border rounded-lg bg-muted/20 relative">
        {isDataLoading || !isReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/50 backdrop-blur-sm z-10">
            <Icon
              name="LoaderCircle"
              className="w-8 h-8 animate-spin text-primary"
            />
            <p className="text-sm text-muted-foreground animate-pulse">
              {isDataLoading
                ? "Loading branch info..."
                : "Preparing your receipt..."}
            </p>
          </div>
        ) : null}

        <PDFViewer width="100%" height="100%" showToolbar={false}>
          <ReceiptPdf
            order={order}
            tenantName={user.tenant?.name || "Cedar Point"}
            branchName={branch?.name || "Main Branch"}
            branchAddress={branch?.address || ""}
            branchPhone={branch?.phone || ""}
            orderNumber={orderNumber}
            loyaltyApplied={loyaltyApplied}
            tenantCurrencies={tenantCurrencies}
            baseCurrencyCode={baseCurrencyCode}
            logoUrl={user.tenant?.logoUrl}
          />
        </PDFViewer>
      </div>

      <Button
        variant="outline"
        className="h-12"
        onClick={handlePrint}
        disabled={!isReady}
      >
        <Icon name="Printer" className="w-4 h-4 mr-2" />
        Print Receipt
      </Button>
    </div>
  );
};
