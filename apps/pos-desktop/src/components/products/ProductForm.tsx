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
import { useBranchStore } from "@/store/branchStore";
import { useAdjustStock } from "@/hooks/useStock";
import { useState } from "react";
import { useBranchesByTenant } from "@/hooks/useBranch";

type Props = {
  product?: ProductWithRelations;
};

export const ProductForm = ({ product }: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const { branchId } = useBranchStore();
  const { user } = useAuthStore();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const adjustStock = useAdjustStock();

  const isEdit = Boolean(product);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: branches = [] } = useBranchesByTenant(user?.tenantId);

  const inventory = product?.inventory?.filter(
    (inv) => inv?.branchId === branchId
  )[0];

  const initialStock = inventory?.stock ? Number(inventory.stock) : 0;

  const form = useForm({
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      sku: product?.sku || "",
      barcode: product?.barcode || "",
      stock: inventory?.stock || "",
      price: product?.price?.toString() || "",
      cost: product?.cost?.toString() || "",
      categoryId: product?.categoryId || "",
      branchId: product?.branchId || "",
      isActive: product?.isActive ?? true,
      isIngredient: product?.isIngredient ?? false,
      isModifiable: product?.isModifiable ?? false,
    },
    onSubmit: async ({ value }) => {
      try {
        const stockValue = value.stock ? Number(value.stock) : 0;

        const data = {
          tenantId: user?.tenantId!,
          name: value.name,
          description: value.description || undefined,
          sku: value.sku || undefined,
          barcode: value.barcode || undefined,
          price: value.price ? value.price : undefined,
          cost: value.cost ? value.cost : undefined,
          categoryId: value.categoryId || undefined,
          branchId: value.branchId || undefined,
          isActive: value.isActive,
          isIngredient: value.isIngredient,
          isModifiable: value.isModifiable,
        };

        let productId: string;

        if (product) {
          // Update existing product
          await updateMutation.mutateAsync({ id: product.id, data });
          productId = product.id;
        } else {
          // Create new product
          const newProduct = await createMutation.mutateAsync(data);
          productId = newProduct.id;
        }

        // Handle stock adjustment separately using inventory transaction service
        if (stockValue !== initialStock || isEdit) {
          setIsAdjustingStock(true);

          try {
            if (isEdit) {
              // For existing products, use SET_STOCK to override
              await adjustStock.mutateAsync({
                branchId: branchId!,
                productId,
                adjustmentType: "SET_STOCK",
                quantity: stockValue,
                reason: `Stock adjusted during product update to ${stockValue} units`,
              });
            } else {
              // For new products, use STOCK_IN to set initial stock
              if (stockValue > 0) {
                await adjustStock.mutateAsync({
                  branchId: branchId!,
                  productId,
                  adjustmentType: "STOCK_IN",
                  quantity: stockValue,
                  reason: `Initial stock set during product creation`,
                });
              }
            }
          } finally {
            setIsAdjustingStock(false);
          }
        }

        closeModal();
      } catch (error) {
        console.error("Failed to save product:", error);
        setIsAdjustingStock(false);
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
              <InputField label="SKU" placeholder="SKU" field={field} />
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
              <InputField label="Barcode" placeholder="Barcode" field={field} />
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

      <form.Field name="stock">
        {(field) => (
          <InputField
            label="Stock"
            placeholder="0.00"
            field={field}
            step={"0.01"}
          />
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

      <form.Field name="branchId">
        {(field) => (
          <SelectField
            label="Available at Branch"
            subLabel="If no branch is selected, the product will be available at all branches."
            placeholder="Select branch (leave empty for all branches)"
            field={field}
            options={branches.map((branch) => ({
              label: branch.name,
              value: branch.id,
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
          isSubmitting={
            createMutation.isPending ||
            updateMutation.isPending ||
            isAdjustingStock
          }
          disabled={
            createMutation.isPending ||
            updateMutation.isPending ||
            isAdjustingStock
          }
        >
          {isAdjustingStock
            ? "Adjusting Stock..."
            : createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : product
                ? "Update"
                : "Create"}
        </Button>
      </div>
    </form>
  );
};
