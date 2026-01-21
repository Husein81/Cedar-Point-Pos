import { OrderDetailPage } from "@/components/invoices";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/invoices/$orderId")({
  component: OrderDetailPage,
  staticData: {
    breadcrumb: "Order Details",
  },
});
