import { useCategories } from "@/hooks/useCategory";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProduct";
import { useModalStore } from "@/store/modalStore";
import {
  Button,
  InputField,
  SelectField,
  SwitchField,
  TextareaField,
} from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import { generateEan13, generateSku } from "./config";
import { ProductWithRelations } from "@/dto/products.dto";
import { useAuthStore } from "@/store/authStore";

interface ProductFormProps {
  product?: ProductWithRelations;
}

export const ProductForm = ({ product }: ProductFormProps) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const { user } = useAuthStore();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const isEdit = Boolean(product);

  const { data: categories = [] } = useCategories();

  const form = useForm({
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      sku: product?.sku || "",
      barcode: product?.barcode || "",
      price: product?.price?.toString() || "",
      cost: product?.cost?.toString() || "",
      categoryId: product?.categoryId || "",
      isActive: product?.isActive ?? true,
      isIngredient: product?.isIngredient ?? false,
      isModifiable: product?.isModifiable ?? false,
    },
    onSubmit: async ({ value }) => {
      try {
        const data = {
          name: value.name,
          description: value.description || undefined,
          sku: value.sku || undefined,
          barcode: value.barcode || undefined,
          price: value.price ? value.price : undefined,
          cost: value.cost ? value.cost : undefined,
          categoryId: value.categoryId || undefined,
          isActive: value.isActive,
          isIngredient: value.isIngredient,
          isModifiable: value.isModifiable,
          tenantId: user?.tenantId ?? "",
        };

        if (product) {
          await updateMutation.mutateAsync({ id: product.id, data });
        } else {
          await createMutation.mutateAsync(data);
        }
        closeModal();
      } catch (error) {
        console.error("Failed to save product:", error);
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
        listeners={{
          onChange: ({ value }) => {
            // Only auto-generate on create
            if (isEdit) return;

            // If sku/barcode are empty, generate them
            const currentSku = form.getFieldValue("sku");
            const currentBarcode = form.getFieldValue("barcode");

            if (!currentSku?.trim()) {
              form.setFieldValue("sku", generateSku(value));
            }
            if (!currentBarcode?.trim()) {
              form.setFieldValue("barcode", generateEan13());
            }
          },
        }}
      >
        {(field) => (
          <InputField
            label="Name"
            placeholder="Enter product name"
            field={field}
            required
          />
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <TextareaField
            label="Description"
            placeholder="Enter product description"
            field={field}
          />
        )}
      </form.Field>

      <form.Field name="sku">
        {(field) => (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <InputField
                label="SKU"
                disabled={isEdit}
                placeholder="SKU"
                field={field}
              />
            </div>
            {!isEdit && (
              <Button
                type="button"
                variant="outline"
                iconName="Sparkles"
                onClick={() =>
                  form.setFieldValue(
                    "sku",
                    generateSku(form.getFieldValue("name") || "")
                  )
                }
              >
                Generate
              </Button>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="barcode">
        {(field) => (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <InputField
                label="Barcode"
                disabled={isEdit}
                placeholder="Barcode"
                field={field}
              />
            </div>
            {!isEdit && (
              <Button
                type="button"
                variant="outline"
                iconName="Sparkles"
                onClick={() => form.setFieldValue("barcode", generateEan13())}
              >
                Generate
              </Button>
            )}
          </div>
        )}
      </form.Field>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="price">
          {(field) => (
            <InputField
              label="Price"
              placeholder="0.00"
              field={field}
              step={"0.01"}
            />
          )}
        </form.Field>

        <form.Field name="cost">
          {(field) => (
            <InputField
              label="Cost"
              placeholder="0.00"
              field={field}
              step={"0.01"}
            />
          )}
        </form.Field>
      </div>

      <form.Field name="categoryId">
        {(field) => (
          <SelectField
            label="Category"
            placeholder="Select category"
            field={field}
            options={categories.map((category) => ({
              label: category.name,
              value: category.id,
            }))}
          />
        )}
      </form.Field>

      <div className="space-y-3">
        <form.Field name="isActive">
          {(field) => <SwitchField label="Is Active" field={field} />}
        </form.Field>

        <form.Field name="isIngredient">
          {(field) => <SwitchField label="Is Ingredient" field={field} />}
        </form.Field>

        <form.Field name="isModifiable">
          {(field) => <SwitchField label="Is Modifiable" field={field} />}
        </form.Field>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          type="submit"
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {product ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
