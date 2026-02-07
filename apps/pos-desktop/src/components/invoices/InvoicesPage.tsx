import Heading from "@/components/heading";
import { getInvoiceColumns } from "@/config/invoiceColumn";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { useOrders } from "@/hooks/useOrder";
import { Button, DataTable, Icon, Select } from "@repo/ui";
import { useMemo, useState } from "react";

export function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading, refetch } = useOrders({
    page: String(page),
    limit: String(pageSize),
    search: searchQuery,
    ...(statusFilter && { status: statusFilter as any }),
  });

  const { data: currencyData } = useTenantCurrencies();
  const baseCurrencyCode = currencyData?.baseCurrencyCode || "USD";
  const tenantCurrencies = currencyData?.currencies || [];

  const columns = useMemo(
    () => getInvoiceColumns(tenantCurrencies, baseCurrencyCode),
    [tenantCurrencies, baseCurrencyCode],
  );

  const orders = data?.data ?? [];
  const totalPages = Math.ceil(
    Number(data?.pagination?.totalCount ?? 1) / pageSize,
  );

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when page size changes
  };

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
          options={[
            // { label: "All Statuses", value: "" },
            { label: "Completed", value: "COMPLETED" },
            { label: "Ready", value: "READY" },
            { label: "In Progress", value: "IN_PROGRESS" },
            { label: "Confirmed", value: "CONFIRMED" },
            { label: "In Kitchen", value: "SENT_TO_KITCHEN" },
            { label: "Pending", value: "PENDING" },
            { label: "On Hold", value: "ON_HOLD" },
            { label: "Draft", value: "DRAFT" },
            { label: "Partial Refund", value: "PARTIALLY_REFUNDED" },
            { label: "Fully Refunded", value: "FULLY_REFUNDED" },
            { label: "Cancelled", value: "CANCELLED" },
          ]}
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
        columns={columns}
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
          onPageSizeChange: handlePageSizeChange,
        }}
      />
    </div>
  );
}
