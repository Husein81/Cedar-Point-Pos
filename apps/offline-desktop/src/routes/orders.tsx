import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, Shad } from "@repo/ui";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { getOrderColumns } from "@/components/orders/orderColumns";
import { useOrders } from "@/hooks/useOrder";
import { useSettings } from "@/hooks/useSettings";
import { OrderStatus } from "@/shared/enums";
import type { Order } from "@/shared/models";
import { usePagination } from "@/hooks/usePagination";

const ALL_STATUSES = "ALL";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const {
    page,
    setPage,
    pageSize,
    searchQuery,
    setSearchQuery,
    onPageSizeChange,
  } = usePagination({});

  const [status, setStatus] = useState<string>(ALL_STATUSES);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useOrders({
    page,
    pageSize,
    search: searchQuery || undefined,
    status: status === ALL_STATUSES ? undefined : status,
  });
  const { data: settings } = useSettings();

  const currencySymbol = settings?.currencySymbol ?? "$";

  const columns = getOrderColumns({
    currencySymbol,
    onRowClick: (order: Order) => setSelectedOrderId(order.id),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Completed sales, refunds and receipts
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        onRefetch={refetch}
        search={{
          term: searchQuery,
          onTermChange: (term) => {
            setSearchQuery(term);
            setPage(1);
          },
          keys: ["orderNumber", "customerName"],
        }}
        actions={
          <Shad.Select
            value={status}
            onValueChange={(value: string) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <Shad.SelectTrigger className="w-44">
              <Shad.SelectValue placeholder="All statuses" />
            </Shad.SelectTrigger>
            <Shad.SelectContent>
              <Shad.SelectItem value={ALL_STATUSES}>
                All statuses
              </Shad.SelectItem>
              <Shad.SelectItem value={OrderStatus.COMPLETED}>
                Completed
              </Shad.SelectItem>
              <Shad.SelectItem value={OrderStatus.PARTIALLY_REFUNDED}>
                Partially refunded
              </Shad.SelectItem>
              <Shad.SelectItem value={OrderStatus.REFUNDED}>
                Refunded
              </Shad.SelectItem>
            </Shad.SelectContent>
          </Shad.Select>
        }
        pagination={{
          rows: data?.total ?? 0,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
          onPageChange: setPage,
          onPageSizeChange,
        }}
      />

      <OrderDetailsDialog
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
