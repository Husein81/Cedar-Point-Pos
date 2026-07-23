import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button, DataTable } from "@repo/ui";
import { CustomerForm } from "@/components/customer/CustomerForm";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getCustomerColumns } from "@/components/customer/customerColumns";
import { useCustomers, useDeleteCustomer } from "@/hooks/useCustomer";
import type { Customer } from "@/shared/models";
import { usePagination } from "@/hooks/usePagination";

export const Route = createFileRoute("/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const {
    page,
    pageSize,
    setPage,
    onPageSizeChange,
    searchQuery,
    setSearchQuery,
  } = usePagination({});

  const { data, isLoading, refetch } = useCustomers({
    page,
    pageSize,
    search: searchQuery || undefined,
  });
  const deleteCustomer = useDeleteCustomer();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const columns = getCustomerColumns({
    onEdit: (customer) => {
      setEditing(customer);
      setIsFormOpen(true);
    },
    onDelete: (customer) => setDeleting(customer),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer records and contact details
          </p>
        </div>
        <Button
          iconName="Plus"
          onClick={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
        >
          New Customer
        </Button>
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
          keys: ["name", "phone", "email"],
        }}
        pagination={{
          rows: data?.total ?? 0,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
          onPageChange: setPage,
          onPageSizeChange,
        }}
      />

      <CustomerForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        customer={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete customer?"
        description={`"${deleting?.name}" will be removed. Their order history is kept.`}
        isPending={deleteCustomer.isPending}
        onConfirm={async () => {
          if (deleting) await deleteCustomer.mutateAsync(deleting.id);
        }}
      />
    </div>
  );
}
