import { useCreateModifier, useUpdateModifier } from "@/hooks/useModifierApi";
import { useProducts } from "@/hooks/useProduct";
import { useModalStore } from "@/store/modalStore";
import { Product } from "@repo/types";
import { Button, InputField, MultiSelectField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

/**
 * ========================================
 * MODIFIER FORM DIALOG
 * ========================================
 * Dialog for creating/editing individual modifiers using TanStack Form
 */

interface ModifierFormProps {
  groupId?: string;
  editingModifier?: {
    id: string;
    name: string;
    price: number;
    productAssignments?: {
      id: string;
      productId: string;
      product: {
        id: string;
        name: string;
      };
    }[];
  };
}

export const ModifierForm = ({
  groupId,
  editingModifier,
}: ModifierFormProps) => {
  const { closeModal: onClose } = useModalStore();
  const isEditMode = !!editingModifier;

  const createModifier = useCreateModifier();
  const updateModifier = useUpdateModifier();
  const { data: products } = useProducts();

  // Filter to only show modifiable products
  const modifiableProducts =
    products?.filter((p: Product) => p.isModifiable && !p.deletedAt) || [];

  const isLoading = createModifier.isPending || updateModifier.isPending;

  const form = useForm({
    defaultValues: {
      name: editingModifier?.name || "",
      price: editingModifier?.price?.toString() || "0.00",
      productIds: editingModifier?.productAssignments?.map((a) => a.productId) || [],
    },
    onSubmit: async ({ value }) => {
      if (!groupId) return;

      try {
        const submitData = {
          name: value.name,
          price: parseFloat(value.price) || 0,
          productIds: value.productIds || [],
        };

        if (isEditMode && editingModifier) {
          await updateModifier.mutateAsync({
            groupId,
            modifierId: editingModifier.id,
            data: submitData,
          });
        } else {
          await createModifier.mutateAsync({
            groupId,
            data: submitData,
          });
        }
        onClose();
      } catch (error) {
        console.error("Failed to save modifier:", error);
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
      {/* Name Field */}
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            !value || value.trim().length === 0
              ? "Modifier name is required"
              : value.length > 100
                ? "Name must be 100 characters or less"
                : undefined,
        }}
      >
        {(field) => (
          <InputField
            label="Modifier Name"
            placeholder="e.g., Extra Cheese, Large, Well-done"
            field={field}
            required
          />
        )}
      </form.Field>

      {/* Price Field */}
      <form.Field
        name="price"
        validators={{
          onChange: ({ value }) => {
            const num = parseFloat(value);
            return isNaN(num) || num < 0
              ? "Price must be a valid positive number"
              : undefined;
          },
        }}
      >
        {(field) => (
          <InputField
            label="Additional Price"
            placeholder="0.00"
            type="number"
            step="0.01"
            min="0"
            field={field}
            required
          />
        )}
      </form.Field>

      {/* Product Assignment (Optional) */}
      <form.Field name="productIds">
        {(field) => (
          <MultiSelectField
            label="Assign to Products"
            placeholder="Select products (optional)"
            subLabel="💡 Leave empty to make this modifier available to all modifiable products."
            field={field}
            options={modifiableProducts.map((product: Product) => ({
              value: product.id,
              label: product.name,
            }))}
          />
        )}
      </form.Field>

      {/* Info */}
      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-md p-3">
        <p className="text-xs text-muted-foreground">
          💡 Set price to $0 for options with no additional charge.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isSubmitting={isLoading}
          disabled={isLoading}
          className="flex-1"
        >
          {isEditMode ? "Update Modifier" : "Add Modifier"}
        </Button>
      </div>
    </form>
  );
};
