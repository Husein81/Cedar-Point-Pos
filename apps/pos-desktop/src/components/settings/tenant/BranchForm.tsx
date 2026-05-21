import { branchApi } from "@/apis/branchApi";
import { useForm } from "@tanstack/react-form";
import { Button, InputField, Shad } from "@repo/ui";
import { Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Branch } from "@repo/types";

type Props = {
  branch?: Branch;
  onSuccess: () => void;
  onCancel: () => void;
};

export function BranchForm({ branch, onSuccess, onCancel }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      name: branch?.name || "",
      address: branch?.address || "",
      phone: branch?.phone || "",
    },
    onSubmit: async ({ value }) => {
      try {
        setIsLoading(true);
        if (branch?.id) {
          await branchApi.updateBranch(branch.id, value as Partial<Branch>);
          toast.success("Branch updated successfully");
        } else {
          await branchApi.createBranch(value as Partial<Branch>);
          toast.success("Branch created successfully");
        }
        onSuccess();
      } catch (error) {
        console.error(error);
        toast.error(
          branch?.id ? "Failed to update branch" : "Failed to create branch",
        );
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => (!value ? "Name is required" : undefined),
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
            placeholder="Enter address"
          />
        )}
      </form.Field>

      <form.Field name="phone">
        {(field) => (
          <InputField
            label="Phone"
            field={field}
            placeholder="Enter phone number"
          />
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} type="button">
          Cancel
        </Button>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              isSubmitting={isSubmitting || isLoading}
              disabled={!canSubmit || isSubmitting || isLoading}
            >
              <Save className="mr-2 h-4 w-4" />
              {branch?.id ? "Update Branch" : "Create Branch"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
