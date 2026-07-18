import { useCategories } from "@/hooks/useCategory";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProduct";
import { useModalStore } from "@/store/modalStore";
import {
  Button,
  Icon,
  Input,
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
import { useState, useRef, useMemo } from "react";
import { useBranchesByTenant } from "@/hooks/useBranch";
import { useUploadProductImage } from "@/hooks/useUploadImage";
import type { Product } from "@repo/types";

type Props = {
  product?: ProductWithRelations;
  onCreated?: (product: Product) => void;
};

export const ProductForm = ({ product, onCreated }: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const { branchId } = useBranchStore();
  const { user } = useAuthStore();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const adjustStock = useAdjustStock();
  const uploadImage = useUploadProductImage();

  const isEdit = Boolean(product);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.imageUrl || null,
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    product?.categoryId || "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useCategories();
  const { data: branches = [] } = useBranchesByTenant(user?.tenantId);

  const inventory = product?.inventory?.filter(
    (inv) => inv?.branchId === branchId,
  )[0];

  const initialStock = inventory?.stock ? Number(inventory.stock) : 0;

  // Get subcategories for the selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];

    const selectedCategory = categories.find(
      (cat) => cat.id === selectedCategoryId,
    );
    return (
      selectedCategory?.subcategories?.filter((sub) => !sub.deletedAt) || []
    );
  }, [categories, selectedCategoryId]);

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
      subcategoryId: product?.subcategoryId || "",
      branchId: product?.branchId || "all",
      imageUrl: product?.imageUrl || "",
      isActive: product?.isActive ?? true,
      isModifiable: product?.isModifiable ?? false,
    },
    onSubmit: async ({ value }) => {
      try {
        const stockValue = value.stock ? Number(value.stock) : 0;

        // Resolve the image fields to persist: upload a newly-selected file and
        // store its key, clear an explicitly removed image, or leave the
        // existing one untouched. `imageUrl` is cleared whenever `imageKey`
        // changes so a stale legacy URL can't shadow the new key.
        const imageFields: {
          imageKey?: string | null;
          imageUrl?: string | null;
        } = {};
        if (imageFile) {
          setIsUploadingImage(true);
          try {
            const { key } = await uploadImage.mutateAsync(imageFile);
            imageFields.imageKey = key;
            imageFields.imageUrl = null;
          } catch {
            // useUploadProductImage already surfaced the error toast.
            setIsUploadingImage(false);
            return;
          } finally {
            setIsUploadingImage(false);
          }
        } else if (!imagePreview) {
          imageFields.imageKey = null;
          imageFields.imageUrl = null;
        }

        const data = {
          name: value.name,
          description: value.description || undefined,
          sku: value.sku || undefined,
          barcode: value.barcode || undefined,
          price: value.price ? value.price : undefined,
          cost: value.cost ? value.cost : undefined,
          categoryId: value.categoryId || undefined,
          subcategoryId: value.subcategoryId || undefined,
          branchId:
            value.branchId === "all"
              ? product
                ? null
                : undefined
              : value.branchId || (product ? null : undefined),
          ...imageFields,
          isActive: value.isActive,
          isModifiable: value.isModifiable,
        };

        let productId: string;
        let createdProduct: Product | null = null;

        if (product) {
          // Update existing product
          await updateMutation.mutateAsync({ id: product.id, data });
          productId = product.id;
        } else {
          // Create new product
          createdProduct = await createMutation.mutateAsync(data);
          productId = createdProduct.id;
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

        if (createdProduct && onCreated) {
          // Caller (e.g. an inline dialog) controls dismissal.
          onCreated(createdProduct);
          return;
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

      <div className="space-y-2">
        <label className="text-sm font-medium">Product Image</label>
        <div className="flex items-center gap-4">
          {imagePreview ? (
            <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
              <img
                src={imagePreview}
                alt="Product preview"
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                size="icon"
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="absolute top-1 right-1 size-4 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
              >
                <Icon name="X" className="size-3" />
              </Button>
            </div>
          ) : (
            <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
              <Icon name="Image" className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
              id="product-image-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              iconName="Upload"
            >
              {imagePreview ? "Change Image" : "Upload Image"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Recommended: Square image, max 5MB
            </p>
          </div>
        </div>
      </div>

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
                    generateSku(form.getFieldValue("name") || ""),
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

      <form.Field
        name="categoryId"
        listeners={{
          onChange: ({ value }) => {
            // Update selected category state and clear subcategory
            setSelectedCategoryId(value);
            form.setFieldValue("subcategoryId", "");
          },
        }}
      >
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

      {availableSubcategories.length > 0 && (
        <form.Field name="subcategoryId">
          {(field) => (
            <SelectField
              label="Subcategory"
              placeholder="Select subcategory (optional)"
              field={field}
              options={availableSubcategories.map((subcategory) => ({
                label: subcategory.name,
                value: subcategory.id,
              }))}
            />
          )}
        </form.Field>
      )}

      <form.Field name="branchId">
        {(field) => (
          <SelectField
            label="Available at Branch"
            subLabel="If no branch is selected, the product will be available at all branches."
            placeholder="Select branch (leave empty for all branches)"
            field={field}
            options={[
              {
                label: "All Branches",
                value: "all",
              },
              ...branches.map((branch) => ({
                label: branch.name,
                value: branch.id,
              })),
            ]}
          />
        )}
      </form.Field>

      <div className="space-y-3">
        <form.Field name="isActive">
          {(field) => <SwitchField label="Is Active" field={field} />}
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
          className="w-24"
          isSubmitting={
            createMutation.isPending ||
            updateMutation.isPending ||
            isAdjustingStock ||
            isUploadingImage
          }
          disabled={
            createMutation.isPending ||
            updateMutation.isPending ||
            isAdjustingStock ||
            isUploadingImage
          }
        >
          {product ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
