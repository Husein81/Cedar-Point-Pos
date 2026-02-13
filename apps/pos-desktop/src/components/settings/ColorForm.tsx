import { useCreateColor, useUpdateColor } from "@/hooks/useColor";
import { useModalStore } from "@/store/modalStore";
import type { Color } from "@repo/types";
import { Button, InputField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

type Props = {
  color?: Color;
};

export const ColorForm = ({ color }: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const createMutation = useCreateColor();
  const updateMutation = useUpdateColor();

  const form = useForm({
    defaultValues: {
      name: color?.name || "",
      hex: color?.hex || "#000000",
    },
    onSubmit: async ({ value }) => {
      try {
        if (color) {
          await updateMutation.mutateAsync({
            id: color.id,
            data: value,
          });
        } else {
          await createMutation.mutateAsync(value);
        }
        closeModal();
      } catch (error) {
        console.error("Failed to save color:", error);
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
            placeholder="Enter color name"
            required
          />
        )}
      </form.Field>

      <form.Field
        name="hex"
        validators={{
          onChange: ({ value }) =>
            !value || !/^#[0-9A-F]{6}$/i.test(value)
              ? "Enter a valid hex color (e.g., #FF0000)"
              : undefined,
        }}
      >
        {(field) => (
          <div className="space-y-2">
            <InputField
              label="Hex Color"
              field={field}
              placeholder="#000000"
              required
            />
            <div
              className="w-full h-10 rounded border"
              style={{ backgroundColor: field.state.value }}
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
          {color ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
