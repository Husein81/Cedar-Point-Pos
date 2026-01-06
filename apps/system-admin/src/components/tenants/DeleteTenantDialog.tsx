"use client";

import { Button, Shad, Icon } from "@repo/ui";
import { useDeleteTenant } from "@/hooks/tenant";
import type { TenantWithCount } from "@/types/tenant";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantWithCount | null;
};

export function DeleteTenantDialog({ open, onOpenChange, tenant }: Props) {
  const deleteTenant = useDeleteTenant();

  if (!tenant) return null;

  const hasUsers = tenant._count.users > 0;
  const hasBranches = tenant._count.branches > 0;

  const handleDelete = async () => {
    try {
      await deleteTenant.mutateAsync(tenant.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete tenant:", error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={handleClose}>
      <Shad.DialogContent>
        <Shad.DialogHeader>
          <Shad.DialogTitle className="flex items-center gap-2">
            <Icon name="AlertTriangle" className="text-destructive" size={20} />
            Delete Tenant
          </Shad.DialogTitle>
          <Shad.DialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete <strong>{tenant.name}</strong>?
              </p>

              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <Icon
                  name="AlertTriangle"
                  size={16}
                  className="text-destructive mt-0.5 shrink-0"
                />
                <div className="text-sm text-destructive">
                  <p className="font-medium">This action cannot be undone</p>
                  <p>
                    This will permanently delete the tenant and{" "}
                    <span className="font-semibold">all associated data</span>,
                    including:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {hasBranches && (
                      <li>
                        {tenant._count.branches} branch
                        {tenant._count.branches !== 1 ? "es" : ""}
                      </li>
                    )}
                    {hasUsers && (
                      <li>
                        {tenant._count.users} user
                        {tenant._count.users !== 1 ? "s" : ""}
                      </li>
                    )}
                    <li>All products, orders, and other data</li>
                  </ul>
                </div>
              </div>

              {deleteTenant.isError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {deleteTenant.error?.message || "Failed to delete tenant"}
                </div>
              )}
            </div>
          </Shad.DialogDescription>
        </Shad.DialogHeader>
        <Shad.DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={deleteTenant.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteTenant.isPending}
            isSubmitting={deleteTenant.isPending}
          >
            Delete Tenant
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
}
