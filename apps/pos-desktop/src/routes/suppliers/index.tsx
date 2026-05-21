import { SupplierForm } from "@/components/supplier/SupplierForm";
import TitleBar from "@/components/title-bar";
import { getSupplierColumns } from "@/config/columns/supplierColumn";
import { useSuppliersPaginated } from "@/hooks/useSupplier";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/suppliers/")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Suppliers",
  },
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: suppliersResponse,
    isLoading,
    refetch,
  } = useSuppliersPaginated({
    search: searchQuery,
  });
  const openModal = useModalStore((state) => state.openModal);

  const handleCreateSupplier = () => {
    openModal("Create Supplier", <SupplierForm />);
  };

  return (
    <div className="space-y-4 pt-4">
      <TitleBar title="Suppliers" subtitle="Browse and manage all suppliers" />
      <DataTable
        isLoading={isLoading}
        columns={getSupplierColumns()}
        data={suppliersResponse?.data ?? []}
        onRefetch={refetch}
        actions={
          <Button onClick={handleCreateSupplier} iconName="Plus">
            Add Supplier
          </Button>
        }
        search={{
          term: searchQuery,
          onTermChange: setSearchQuery,
          keys: ["name", "companyName", "phone", "email"],
        }}
      />
    </div>
  );
}
