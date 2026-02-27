import { PurchaseOrdersPage } from "@/components/purchase-order/PurchaseOrdersPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/purchase-orders/")({
  component: PurchaseOrdersPage,
  staticData: {
    breadcrumb: "Purchase Orders",
  },
});
