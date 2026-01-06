"use client";

import { useForm } from "@tanstack/react-form";
import { Button, InputField, SelectField, Shad } from "@repo/ui";
import { useCreateTenant } from "@/hooks/tenant";
import { BusinessType } from "@repo/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const businessTypeOptions = [
  { value: BusinessType.RESTAURANT, label: "Restaurant" },
  { value: BusinessType.RETAIL, label: "Retail" },
];

export function CreateTenantDialog({ open, onOpenChange }: Props) {
  const createTenant = useCreateTenant();

  const form = useForm({
    defaultValues: {
      name: "",
      businessType: "" as BusinessType,
    },
    onSubmit: async ({ value }) => {
      try {
        await createTenant.mutateAsync({
          name: value.name,
          businessType: value.businessType,
        });
        form.reset();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to create tenant:", error);
      }
    },
  });

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={handleClose}>
      <Shad.DialogContent>
        <Shad.DialogHeader>
          <Shad.DialogTitle>Create New Tenant</Shad.DialogTitle>
          <Shad.DialogDescription>
            Create a new tenant organization. The first user created for this
            tenant must be an Admin.
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {createTenant.isError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {createTenant.error?.message || "Failed to create tenant"}
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

          <Shad.DialogFooter>
            <Button variant="outline" onClick={handleClose} type="button">
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || createTenant.isPending}
                  isSubmitting={createTenant.isPending}
                >
                  Create Tenant
                </Button>
              )}
            </form.Subscribe>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
}
