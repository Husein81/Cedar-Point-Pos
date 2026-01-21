import { OrderPage } from "@/components/orders/OrderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/orders/")({
  component: OrderPage,
});
