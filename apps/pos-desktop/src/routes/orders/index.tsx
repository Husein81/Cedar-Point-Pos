import { createFileRoute } from "@tanstack/react-router";
import OrderPage from "./OrderPage";

export const Route = createFileRoute("/orders/")({
  component: OrderPage,
});
