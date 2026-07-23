import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button, Label, Shad, Switch } from "@repo/ui";
import { FormField } from "@/components/common/FormField";
import { useCategories } from "@/hooks/useCategory";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useProduct";
import { ProductSchema } from "@/shared/schemas";
import type { Product } from "@/shared/models";

type FormValues = z.input<typeof ProductSchema>;
type FormOutput = z.output<typeof ProductSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
};

const NO_CATEGORY = "NONE";

export const ProductForm = ({ open, onOpenChange, product }: Props) => {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories } = useCategories();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      name: "",
      sku: null,
      barcode: null,
      price: 0,
      cost: 0,
      stock: 0,
      trackInventory: true,
      lowStockThreshold: null,
      categoryId: null,
      imagePath: null,
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: product?.name ?? "",
        sku: product?.sku ?? null,
        barcode: product?.barcode ?? null,
        price: product?.price ?? 0,
        cost: product?.cost ?? 0,
        stock: product?.stock ?? 0,
        trackInventory: product?.trackInventory ?? true,
        lowStockThreshold: product?.lowStockThreshold ?? null,
        categoryId: product?.categoryId ?? null,
        imagePath: product?.imagePath ?? null,
        isActive: product?.isActive ?? true,
      });
    }
  }, [open, product, reset]);

  const onSubmit = async (value: FormOutput) => {
    if (product) {
      await updateProduct.mutateAsync({ id: product.id, data: value });
    } else {
      await createProduct.mutateAsync(value);
    }
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="max-w-lg">
        <Shad.DialogHeader>
          <Shad.DialogTitle>
            {product ? "Edit Product" : "New Product"}
          </Shad.DialogTitle>
        </Shad.DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Name"
            placeholder="Product name"
            registration={register("name")}
            error={errors.name}
            autoFocus
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="SKU"
              placeholder="Optional"
              registration={register("sku")}
              error={errors.sku}
            />
            <FormField
              label="Barcode"
              placeholder="Scan or type"
              registration={register("barcode")}
              error={errors.barcode}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Price"
              type="number"
              step="0.01"
              registration={register("price", { valueAsNumber: true })}
              error={errors.price}
              required
            />
            <FormField
              label="Cost"
              type="number"
              step="0.01"
              registration={register("cost", { valueAsNumber: true })}
              error={errors.cost}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Shad.Select
                  value={field.value ?? NO_CATEGORY}
                  onValueChange={(value: string) =>
                    field.onChange(value === NO_CATEGORY ? null : value)
                  }
                >
                  <Shad.SelectTrigger className="w-full">
                    <Shad.SelectValue placeholder="No category" />
                  </Shad.SelectTrigger>
                  <Shad.SelectContent>
                    <Shad.SelectItem value={NO_CATEGORY}>
                      No category
                    </Shad.SelectItem>
                    {categories?.map((category) => (
                      <Shad.SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </Shad.SelectItem>
                    ))}
                  </Shad.SelectContent>
                </Shad.Select>
              )}
            />
          </div>

          {/* Inventory */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Stock"
              type="number"
              registration={register("stock", { valueAsNumber: true })}
              error={errors.stock}
            />
            <FormField
              label="Low Stock Alert"
              type="number"
              placeholder="Optional"
              registration={register("lowStockThreshold", {
                setValueAs: (value: string) =>
                  value === "" || value === null ? null : Number(value),
              })}
              error={errors.lowStockThreshold}
            />
          </div>

          <div className="flex items-center justify-between gap-6">
            <Controller
              control={control}
              name="trackInventory"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label>Track inventory</Label>
                </div>
              )}
            />
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label>Active</Label>
                </div>
              )}
            />
          </div>

          <Shad.DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} isSubmitting={isSubmitting}>
              {product ? "Save" : "Create"}
            </Button>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
