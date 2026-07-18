import TitleBar from "@/components/title-bar";
import { getInvoiceColumns } from "@/components/invoices/invoiceColumn";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { useOrders } from "@/hooks/useOrder";
import { usePaginationState } from "@/hooks/usePaginationState";
import { Button, DataTable, Icon, Select } from "@repo/ui";
import { useMemo, useState } from "react";

export function InvoicesPage() {
  const {
    page,
    setPage,
    pageSize,
    onPageSizeChange,
    searchQuery,
    setSearchQuery,
  } = usePaginationState({
    initialPage: 1,
    initialPageSize: 10,
  });

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

  return (
    <div className="space-y-4 pt-4">
      <TitleBar
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
            { label: "Served", value: "SERVED" },
            { label: "Ready", value: "READY" },
            { label: "Preparing", value: "PREPARING" },
            { label: "Placed", value: "PLACED" },
            { label: "Draft", value: "DRAFT" },
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
          onPageSizeChange,
        }}
      />
    </div>
  );
}
