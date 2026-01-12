import { useCreateCategory, useUpdateCategory } from "@/hooks/useCategory";
import { useModalStore } from "@/store/modalStore";
import type { Category } from "@repo/types";
import { Button, InputField, TextareaField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

type Props = {
  category?: Category;
};

export const CategoryForm = ({ category }: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const form = useForm({
    defaultValues: {
      name: category?.name || "",
      code: category?.code || "",
      description: category?.description || "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (category) {
          await updateMutation.mutateAsync({
            id: category.id,
            data: {
              name: value.name,
              code: value.code || undefined,
              description: value.description || undefined,
            },
          });
        } else {
          await createMutation.mutateAsync({
            name: value.name,
            code: value.code || undefined,
            description: value.description || undefined,
          });
        }
        closeModal();
      } catch (error) {
        console.error("Failed to save category:", error);
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
          <InputField
            label="Name"
            field={field}
            placeholder="Enter category name"
            required
          />
        )}
      </form.Field>

      <form.Field name="code">
        {(field) => (
          <InputField
            label="Code"
            field={field}
            placeholder="Enter category code"
          />
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <TextareaField
            label="Description"
            field={field}
            placeholder="Enter category description"
          />
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-24"
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {category ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
