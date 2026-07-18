import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import TitleBar from "@/components/title-bar";
import { getPurchaseOrdersColumns } from "@/components/purchase-orders/purchaseOrderColumn";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { usePaginationState } from "@/hooks/usePaginationState";
import { usePurchaseOrdersPaginated } from "@/hooks/usePurchaseOrder";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

export const Route = createFileRoute("/purchase-orders/")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Purchase Orders",
  },
});

function RouteComponent() {
  const {
    page,
    pageSize,
    setPage,
    setSearchQuery,
    searchQuery,
    onPageSizeChange,
  } = usePaginationState({
    initialPage: 1,
    initialPageSize: 10,
  });

  const {
    data: purchaseOrdersResponse,
    isLoading,
    refetch,
  } = usePurchaseOrdersPaginated({
    page: String(page),
    limit: String(pageSize),
    search: searchQuery,
  });

  const { data: currencyData } = useTenantCurrencies();
  const baseCurrencyCode = currencyData?.baseCurrencyCode || "USD";

  const columns = useMemo(
    () => getPurchaseOrdersColumns(baseCurrencyCode),
    [baseCurrencyCode],
  );

  const openModal = useModalStore((state) => state.openModal);

  const handleCreate = () => {
    openModal("Create Purchase Order", <PurchaseOrderForm />);
  };

  const totalCount = purchaseOrdersResponse?.pagination?.totalCount ?? 0;
  const totalPages =
    purchaseOrdersResponse?.pagination?.totalPages ??
    Math.max(Math.ceil(totalCount / pageSize), 1);

  return (
    <div className="space-y-4 pt-4">
      <TitleBar
        title="Purchase Orders"
        subtitle="Manage supplier purchase orders and inventory intake"
      />
      <DataTable
        isLoading={isLoading}
        columns={columns}
        data={purchaseOrdersResponse?.data ?? []}
        onRefetch={refetch}
        actions={
          <Button onClick={handleCreate} iconName="Plus">
            New Purchase
          </Button>
        }
        search={{
          term: searchQuery,
          onTermChange: (term) => {
            setSearchQuery(term);
            setPage(1);
          },
          keys: ["orderNumber", "supplier"],
        }}
        pagination={{
          page,
          totalPages,
          pageSize,
          rows: totalCount,
          onPageChange: setPage,
          onPageSizeChange,
        }}
      />
    </div>
  );
}
