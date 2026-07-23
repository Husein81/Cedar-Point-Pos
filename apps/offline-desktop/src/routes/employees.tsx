import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button, DataTable } from "@repo/ui";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getEmployeeColumns } from "@/components/employees/employeeColumns";
import { useDeactivateUser, useUsers } from "@/hooks/useUsers";
import type { User } from "@/shared/models";

export const Route = createFileRoute("/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { data: users, isLoading, refetch } = useUsers();
  const deactivateUser = useDeactivateUser();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);

  const columns = getEmployeeColumns({
    onEdit: (user) => {
      setEditing(user);
      setIsFormOpen(true);
    },
    onDeactivate: (user) => setDeactivating(user),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff accounts and roles
          </p>
        </div>
        <Button
          iconName="Plus"
          onClick={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
        >
          New Employee
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users ?? []}
        isLoading={isLoading}
        onRefetch={refetch}
        search={{ keys: ["name", "username"] }}
      />

      <EmployeeForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        user={editing}
      />

      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate employee?"
        description={`"${deactivating?.name}" will no longer be able to sign in.`}
        confirmLabel="Deactivate"
        isPending={deactivateUser.isPending}
        onConfirm={async () => {
          if (deactivating) await deactivateUser.mutateAsync(deactivating.id);
        }}
      />
    </div>
  );
}
