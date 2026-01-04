import { useForm } from "@tanstack/react-form";
import { Button, Input, Label, Textarea } from "@repo/ui";
import {
  useCreateSubcategory,
  useUpdateSubcategory,
} from "@/hooks/useSubcategory";
import { useModalStore } from "@/store/modalStore";
import type { Subcategory } from "@repo/types";

interface SubcategoryFormProps {
  categoryId: string;
  subcategory?: Subcategory;
}

export const SubcategoryForm = ({
  categoryId,
  subcategory,
}: SubcategoryFormProps) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const createMutation = useCreateSubcategory(categoryId);
  const updateMutation = useUpdateSubcategory();

  const form = useForm({
    defaultValues: {
      name: subcategory?.name || "",
      description: subcategory?.description || "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (subcategory) {
          await updateMutation.mutateAsync({
            id: subcategory.id,
            data: {
              name: value.name,
              description: value.description || undefined,
            },
          });
        } else {
          await createMutation.mutateAsync({
            name: value.name,
            description: value.description || undefined,
          });
        }
        closeModal();
      } catch (error) {
        console.error("Failed to save subcategory:", error);
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
          onChange: ({ value }) =>
            !value || value.trim().length === 0
              ? "Name is required"
              : undefined,
        }}
      >
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Enter subcategory name"
            />
            {field.state.meta.errors && (
              <p className="text-sm text-red-500">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Enter subcategory description"
              rows={3}
            />
          </div>
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : subcategory
              ? "Update"
              : "Create"}
        </Button>
      </div>
    </form>
  );
};
