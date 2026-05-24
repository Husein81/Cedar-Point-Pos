import { CustomerForm } from "@/components/customer/CustomerForm";
import TitleBar from "@/components/title-bar";
import { getCustomerColumns } from "@/constants/columns/customerColumn";
import { useCustomersPaginated } from "@/hooks/useCustomer";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/customers/")({
  component: RouteComponent,
  staticData: {
    breadcrumb: "Customers",
  },
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: customersResponse,
    isLoading,
    refetch,
  } = useCustomersPaginated({
    search: searchQuery,
  });
  const openModal = useModalStore((state) => state.openModal);

  const handleCreateCustomer = () => {
    openModal("Create Customer", <CustomerForm />);
  };

  return (
    <div className="space-y-4 pt-4">
      <TitleBar title="Customers" subtitle="Browse and manage all customers" />
      <DataTable
        isLoading={isLoading}
        columns={getCustomerColumns()}
        data={customersResponse?.data ?? []}
        onRefetch={refetch}
        actions={
          <Button onClick={handleCreateCustomer} iconName="Plus">
            Add Customer
          </Button>
        }
        search={{
          term: searchQuery,
          onTermChange: setSearchQuery,
          keys: ["name", "phone", "email"],
        }}
      />
    </div>
  );
}
