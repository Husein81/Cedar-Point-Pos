import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import TitleBar from "@/components/title-bar";
import { getPurchaseOrdersColumns } from "@/constants/columns/purchaseOrderColumn";
import { usePurchaseOrdersPaginated } from "@/hooks/usePurchaseOrder";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/purchase-orders/")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Purchase Orders",
  },
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: purchaseOrdersResponse,
    isLoading,
    refetch,
  } = usePurchaseOrdersPaginated({ search: searchQuery });

  const openModal = useModalStore((state) => state.openModal);

  const handleCreate = () => {
    openModal("Create Purchase Order", <PurchaseOrderForm />);
  };

  return (
    <div className="space-y-4 pt-4">
      <TitleBar
        title="Purchase Orders"
        subtitle="Manage supplier purchase orders and inventory intake"
      />
      <DataTable
        isLoading={isLoading}
        columns={getPurchaseOrdersColumns()}
        data={purchaseOrdersResponse?.data ?? []}
        onRefetch={refetch}
        actions={
          <Button onClick={handleCreate} iconName="Plus">
            New Purchase Order
          </Button>
        }
        search={{
          term: searchQuery,
          onTermChange: setSearchQuery,
          keys: ["orderNumber", "supplier"],
        }}
      />
    </div>
  );
}
