import Heading from "@/components/heading";
import { getPurchaseOrderListColumns } from "@/config/purchaseOrderColumn";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrder";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable, Icon, Select } from "@repo/ui";
import { useMemo, useState } from "react";
import { CreatePurchaseOrderForm } from "./CreatePurchaseOrderForm";

export function PurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { branchId } = useBranchStore();
  const { openModal } = useModalStore();

  const { data, isLoading, refetch } = usePurchaseOrders({
    page: String(page),
    limit: String(pageSize),
    search: searchQuery,
    ...(statusFilter && { status: statusFilter }),
    ...(branchId && { branchId }),
  });

  const columns = useMemo(() => getPurchaseOrderListColumns(), []);
  const purchaseOrders = data?.data ?? [];
  const totalPages = Math.ceil(
    Number(data?.pagination?.totalCount ?? 1) / pageSize,
  );

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter("");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <div className="space-y-4 pt-4">
      <Heading
        title="Purchase Orders"
        subtitle="Create and manage purchase orders from suppliers"
      />

      <div className="mb-4 flex items-center gap-4">
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(opt) => setStatusFilter(opt.value)}
          options={[
            { label: "Pending", value: "PENDING" },
            { label: "Ordered", value: "ORDERED" },
            { label: "Received", value: "RECEIVED" },
            { label: "Cancelled", value: "CANCELLED" },
          ]}
        />

        <Button variant="outline" size="sm" onClick={handleClearFilters}>
          <Icon name="X" className="h-4 w-4" />
          Clear Filters
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={purchaseOrders}
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
        actions={
          <Button
            onClick={() =>
              openModal("Create Purchase Order", <CreatePurchaseOrderForm />)
            }
            iconName="Plus"
          >
            Create PO
          </Button>
        }
      />
    </div>
  );
}
