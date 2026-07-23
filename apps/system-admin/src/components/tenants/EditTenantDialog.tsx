"use client";

import { useForm } from "@tanstack/react-form";
import { Button, InputField, SelectField, Shad } from "@repo/ui";
import { useUpdateTenant } from "@/hooks/tenant";
import { BusinessType } from "@repo/types";
import type { TenantWithCount } from "@/types/tenant";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantWithCount | null;
};

const businessTypeOptions = [
  { value: BusinessType.RESTAURANT, label: "Restaurant" },
  { value: BusinessType.RETAIL, label: "Retail" },
];

export function EditTenantDialog({ open, onOpenChange, tenant }: Props) {
  const updateTenant = useUpdateTenant();

  const form = useForm({
    defaultValues: {
      name: tenant?.name ?? "",
      businessType: (tenant?.businessType ?? "") as BusinessType,
      code: tenant?.code ?? "",
    },
    onSubmit: async ({ value }) => {
      if (!tenant) return;
      try {
        await updateTenant.mutateAsync({
          id: tenant.id,
          payload: {
            name: value.name,
            businessType: value.businessType,
            code: value.code ? value.code.toUpperCase() : undefined,
          },
        });
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to update tenant:", error);
      }
    },
  });

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  if (!tenant) return null;

  return (
    <Shad.Dialog open={open} onOpenChange={handleClose}>
      <Shad.DialogContent>
        <Shad.DialogHeader>
          <Shad.DialogTitle>Edit Tenant</Shad.DialogTitle>
          <Shad.DialogDescription>
            Update details for <strong>{tenant.name}</strong>.
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {updateTenant.isError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {updateTenant.error?.message || "Failed to update tenant"}
            </div>
          )}

          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                !value ? "Tenant name is required" : undefined,
            }}
          >
            {(field) => (
              <InputField
                label="Tenant Name"
                field={field}
                placeholder="Enter tenant name"
                required
              />
            )}
          </form.Field>

          <form.Field
            name="businessType"
            validators={{
              onChange: ({ value }) =>
                !value ? "Business type is required" : undefined,
            }}
          >
            {(field) => (
              <SelectField
                label="Business Type"
                field={field}
                options={businessTypeOptions}
                placeholder="Select business type"
              />
            )}
          </form.Field>

          <form.Field
            name="code"
            validators={{
              onChange: ({ value }) =>
                value && !/^[A-Za-z0-9-]{3,20}$/.test(value)
                  ? "3-20 letters, digits, or hyphens"
                  : undefined,
            }}
          >
            {(field) => (
              <InputField
                label="Tenant Code"
                subLabel="Unique code staff use to sign in, e.g. CEDAR01. Uppercased automatically."
                field={field}
                placeholder="e.g. CEDAR01"
              />
            )}
          </form.Field>

          <Shad.DialogFooter>
            <Button variant="outline" onClick={handleClose} type="button">
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || updateTenant.isPending}
                  isSubmitting={updateTenant.isPending}
                >
                  Save Changes
                </Button>
              )}
            </form.Subscribe>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
}
