import Heading from "@/components/heading";
import { invoiceColumns } from "@/config/invoiceColumn";
import { useOrders } from "@/hooks/useOrder";
import { usePaginationState } from "@/hooks/usePaginationState";
import { OrderStatus } from "@repo/types";
import { Button, DataTable, Icon, Select } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/invoices/")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const {
    page,
    pageSize,
    searchQuery,
    setSearchQuery,
    onPageSizeChange,
    setPage,
  } = usePaginationState();

  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading, refetch } = useOrders({
    page: String(page),
    limit: String(pageSize),
    search: searchQuery,
    ...(statusFilter && { status: statusFilter as any }),
  });

  const orders = data?.data ?? [];
  const totalPages = Math.ceil(
    Number(data?.pagination?.totalCount ?? 1) / pageSize,
  );
  const options: Option[] = [
    { label: "All Statuses", value: "all" },
    { label: "Completed", value: OrderStatus.COMPLETED },
    { label: "Ready", value: OrderStatus.READY },
    { label: "In Progress", value: OrderStatus.IN_PROGRESS },
    { label: "Confirmed", value: OrderStatus.CONFIRMED },
    { label: "In Kitchen", value: OrderStatus.SENT_TO_KITCHEN },
    { label: "Pending", value: OrderStatus.PENDING },
    { label: "On Hold", value: OrderStatus.ON_HOLD },
    { label: "Draft", value: OrderStatus.DRAFT },
    { label: "Cancelled", value: OrderStatus.CANCELLED },
  ];
  return (
    <div className="space-y-4 pt-4">
      <Heading
        title="Invoices"
        subtitle="View and manage all orders and invoices"
      />

      <div className="flex items-center gap-4 mb-4">
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(opt) => setStatusFilter(opt.value)}
          options={options}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setStatusFilter("");
            setSearchQuery("");
            setPage(1);
          }}
        >
          <Icon name="X" className="w-4 h-4" />
          Clear Filters
        </Button>
      </div>

      <DataTable
        columns={invoiceColumns}
        data={orders}
        isLoading={isLoading}
        onRefetch={refetch}
        search={{
          term: searchQuery,
          onTermChange: setSearchQuery,
          keys: ["orderNumber"],
        }}
        pagination={{
          page,
          totalPages,
          pageSize,
          rows: data?.pagination?.totalCount || 0,
          onPageChange: setPage,
          onPageSizeChange,
        }}
      />
    </div>
  );
}
