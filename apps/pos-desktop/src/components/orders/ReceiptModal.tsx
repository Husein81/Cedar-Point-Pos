import type { PaymentEntry } from "@/components/orders/PaymentForm";
import { ReceiptPdf } from "@/components/receipt/ReceiptPdf";
import { useBranch } from "@/hooks/useBranch";
import { useOrders } from "@/hooks/useOrder";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { useOrderStore } from "@/store/orderStore";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { Button, Icon } from "@repo/ui";

import { useEffect, useState } from "react";

interface Props {
  payments: PaymentEntry[];
  loyaltyApplied?: {
    points: number;
    discount: number;
  };
}

export const ReceiptModal = ({ payments, loyaltyApplied }: Props) => {
  const { getActiveOrder } = useOrderStore();
  const { user } = useAuthStore();
  const { branchId } = useBranchStore();
  const { data: branch } = useBranch(branchId || "");

  const order = getActiveOrder();
  const { data: orders } = useOrders({
    page: "1",
    limit: "1",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const orderCount = orders?.pagination.totalCount ?? 0;
  const orderNumber = `${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, "0")}`;

  const [isReady, setIsReady] = useState(false);

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
        payments={payments}
        tenantName={user.tenant?.name || "Cedar Point"}
        branchName={branch?.name || "Main Branch"}
        branchAddress={branch?.address || ""}
        branchPhone={branch?.phone || ""}
        orderNumber={orderNumber}
        loyaltyApplied={loyaltyApplied}
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
    <div className="flex flex-col gap-4 h-[80vh]">
      <div className="flex-1 overflow-hidden border rounded-lg bg-muted/20 relative">
        {!isReady ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/50 backdrop-blur-sm z-10">
            <Icon
              name="LoaderCircle"
              className="w-8 h-8 animate-spin text-primary"
            />
            <p className="text-sm text-muted-foreground animate-pulse">
              Preparing your receipt...
            </p>
          </div>
        ) : null}

        <PDFViewer width="100%" height="100%" showToolbar={false}>
          <ReceiptPdf
            order={order}
            payments={payments}
            tenantName={user.tenant?.name || "Cedar Point"}
            branchName={branch?.name || "Main Branch"}
            branchAddress={branch?.address || ""}
            branchPhone={branch?.phone || ""}
            orderNumber={orderNumber}
            loyaltyApplied={loyaltyApplied}
          />
        </PDFViewer>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handlePrint} disabled={!isReady}>
          <Icon name="Printer" className="w-4 h-4 mr-2" />
          Print Receipt
        </Button>
      </div>
    </div>
  );
};
