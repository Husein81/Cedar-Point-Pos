import { useCreateCategory, useUpdateCategory } from "@/hooks/useCategory";
import { useColors } from "@/hooks/useColor";
import { useModalStore } from "@/store/modalStore";
import type { Category } from "@repo/types";
import { Button, InputField, Shad, TextareaField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

type Props = {
  category?: Category;
};

export const CategoryForm = ({ category }: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const { data: colors = [] } = useColors();

  const colorOptions = colors.map((c) => ({
    value: c.id,
    hex: c.hex,
    label: c.name,
  }));

  const form = useForm({
    defaultValues: {
      name: category?.name || "",
      code: category?.code || "",
      description: category?.description || "",
      colorId: category?.colorId || "",
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
              colorId: value.colorId || undefined,
            },
          });
        } else {
          await createMutation.mutateAsync({
            name: value.name,
            code: value.code || undefined,
            description: value.description || undefined,
            colorId: value.colorId || undefined,
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

      <form.Field name="colorId">
        {(field) => (
          <Shad.Select
            onValueChange={(value) => field.handleChange(value)}
            defaultValue={field.state.value}
          >
            <Shad.SelectTrigger className="w-full">
              <Shad.SelectValue placeholder="Select a color" />
            </Shad.SelectTrigger>
            <Shad.SelectContent>
              {colorOptions.map((option) => (
                <Shad.SelectItem key={option.value} value={option.value}>
                  <div
                    style={{ backgroundColor: option.hex }}
                    className="mr-2 h-3 w-3 rounded-full"
                  />
                  {option.label}
                </Shad.SelectItem>
              ))}
            </Shad.SelectContent>
          </Shad.Select>
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
