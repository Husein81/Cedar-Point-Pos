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

              {hasUsers ? (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <Icon
                    name="AlertCircle"
                    size={16}
                    className="text-destructive mt-0.5 shrink-0"
                  />
                  <div className="text-sm text-destructive">
                    <p className="font-medium">Cannot delete this tenant</p>
                    <p>
                      This tenant has {tenant._count.users} user
                      {tenant._count.users !== 1 ? "s" : ""}. Please remove all
                      users and associated data before deleting.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <Icon
                    name="AlertTriangle"
                    size={16}
                    className="text-amber-600 mt-0.5 shrink-0"
                  />
                  <p className="text-sm text-amber-800">
                    This action cannot be undone. The tenant and all its
                    configuration will be permanently deleted.
                  </p>
                </div>
              )}

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
            disabled={hasUsers || deleteTenant.isPending}
            isSubmitting={deleteTenant.isPending}
          >
            Delete Tenant
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
}
