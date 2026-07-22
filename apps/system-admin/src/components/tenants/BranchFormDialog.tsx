"use client";

import { useForm } from "@tanstack/react-form";
import { Button, InputField, Shad } from "@repo/ui";
import { useCreateBranch, useUpdateBranch } from "@/hooks/branch";
import type { Branch } from "@/dto/branch.dto";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  branch: Branch | null;
};

export function BranchFormDialog({
  open,
  onOpenChange,
  tenantId,
  branch,
}: Props) {
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const isEditing = !!branch;
  const mutation = isEditing ? updateBranch : createBranch;

  const form = useForm({
    defaultValues: {
      name: branch?.name ?? "",
      address: branch?.address ?? "",
      phone: branch?.phone ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        const payload = {
          name: value.name,
          address: value.address || undefined,
          phone: value.phone || undefined,
        };
        if (isEditing) {
          await updateBranch.mutateAsync({ id: branch.id, tenantId, payload });
        } else {
          await createBranch.mutateAsync({ tenantId, payload });
        }
        form.reset();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to save branch:", error);
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
          <Shad.DialogTitle>
            {isEditing ? "Edit Branch" : "Add Branch"}
          </Shad.DialogTitle>
          <Shad.DialogDescription>
            {isEditing
              ? "Update this branch's details."
              : "Add a new branch to this tenant."}
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {mutation.isError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {mutation.error?.message || "Failed to save branch"}
            </div>
          )}

          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                !value ? "Branch name is required" : undefined,
            }}
          >
            {(field) => (
              <InputField
                label="Branch Name"
                field={field}
                placeholder="Enter branch name"
                required
              />
            )}
          </form.Field>

          <form.Field name="address">
            {(field) => (
              <InputField
                label="Address"
                field={field}
                placeholder="Enter branch address"
              />
            )}
          </form.Field>

          <form.Field name="phone">
            {(field) => (
              <InputField
                label="Phone"
                field={field}
                placeholder="Enter branch phone"
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
                  disabled={!canSubmit || mutation.isPending}
                  isSubmitting={mutation.isPending}
                >
                  {isEditing ? "Save Changes" : "Add Branch"}
                </Button>
              )}
            </form.Subscribe>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
}
