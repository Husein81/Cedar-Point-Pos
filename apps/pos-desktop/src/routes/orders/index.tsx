import { OrderPage } from "@/components/orders/OrderPage";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ordersSearchSchema = z.object({
  tableId: z.string().optional(),
  tableName: z.string().optional(),
});

export const Route = createFileRoute("/orders/")({
  validateSearch: ordersSearchSchema,
  component: OrderPage,
});
