import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "@repo/ui";
import { OrderPage } from "@/components/sales/OrderPage";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useProductByBarcode } from "@/hooks/useProduct";
import { useSettings } from "@/hooks/useSettings";
import { useOrderStore } from "@/store/orderStore";

export const Route = createFileRoute("/")({
  component: SalesPage,
});

function SalesPage() {
  const { data: settings } = useSettings();
  const addItem = useOrderStore((state) => state.addItem);
  const barcodeLookup = useProductByBarcode();

  const handleScan = useCallback(
    (barcode: string) => {
      barcodeLookup.mutate(barcode, {
        onSuccess: (product) => {
          if (product) {
            addItem({
              productId: product.id,
              name: product.name,
              price: product.price,
              quantity: 1,
              imagePath: product.imagePath,
            });
          } else {
            toast.error(`No product with barcode ${barcode}`);
          }
        },
      });
    },
    [barcodeLookup, addItem],
  );

  useBarcodeScanner(handleScan);

  const currencySymbol = settings?.currencySymbol ?? "$";
  const taxRate = settings?.taxRate ?? 0;

  return <OrderPage currencySymbol={currencySymbol} taxRate={taxRate} />;
}
