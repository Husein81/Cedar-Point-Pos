import { OrderPage } from "@/components/orders/OrderPage";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import type { BusinessType } from "@repo/types";

const ordersSearchSchema = z.object({
  tableId: z.string().optional(),
  tableName: z.string().optional(),
  orderType: z.string().optional(),
});

export const Route = createFileRoute("/orders/")({
  validateSearch: ordersSearchSchema,
  component: OrderPageComponent,
});

function OrderPageComponent() {
  const search = Route.useSearch();
  const { user } = useAuthStore();
  const businessType = user?.tenant?.businessType as BusinessType | undefined;

  // If Restaurant and no table selected, and not a direct takeaway order, redirect to Tables page
  if (
    businessType === "RESTAURANT" &&
    !search.tableId &&
    search.orderType !== "takeaway"
  ) {
    return <Navigate to="/tables" />;
  }

  return <OrderPage tableId={search.tableId} tableName={search.tableName} />;
}
