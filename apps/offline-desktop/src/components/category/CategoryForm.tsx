import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button, cn, Icon, Label, Shad } from "@repo/ui";
import { FormField } from "@/components/common/FormField";
import { useCreateCategory, useUpdateCategory } from "@/hooks/useCategory";
import { useColors } from "@/hooks/useColor";
import { CategorySchema } from "@/shared/schemas";
import type { Category } from "@/shared/models";

// Schema input type (pre-default) drives the form; the resolver outputs the
// parsed CategoryInput at submit time.
type FormValues = z.input<typeof CategorySchema>;
type FormOutput = z.output<typeof CategorySchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
};

export const CategoryForm = ({ open, onOpenChange, category }: Props) => {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { data: colors } = useColors();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(CategorySchema),
    defaultValues: { name: "", colorId: null, sortOrder: 0 },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: category?.name ?? "",
        colorId: category?.color?.id ?? null,
        sortOrder: category?.sortOrder ?? 0,
      });
    }
  }, [open, category, reset]);

  const onSubmit = async (value: FormOutput) => {
    if (category) {
      await updateCategory.mutateAsync({ id: category.id, data: value });
    } else {
      await createCategory.mutateAsync(value);
    }
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="max-w-sm">
        <Shad.DialogHeader>
          <Shad.DialogTitle>
            {category ? "Edit Category" : "New Category"}
          </Shad.DialogTitle>
        </Shad.DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Name"
            placeholder="e.g. Beverages"
            registration={register("name")}
            error={errors.name}
            autoFocus
            required
          />

          <FormField
            label="Sort Order"
            type="number"
            registration={register("sortOrder", { valueAsNumber: true })}
            error={errors.sortOrder}
          />

          <div className="space-y-2">
            <Label>Color</Label>
            <Controller
              control={control}
              name="colorId"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-label="No color"
                    onClick={() => field.onChange(null)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border-2 text-muted-foreground",
                      !field.value ? "border-primary" : "border-border",
                    )}
                  >
                    <Icon name="Ban" className="h-3.5 w-3.5" />
                  </button>
                  {colors?.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      aria-label={color.name}
                      title={color.name}
                      onClick={() => field.onChange(color.id)}
                      className={cn(
                        "h-7 w-7 rounded-full border-2",
                        field.value === color.id
                          ? "border-primary"
                          : "border-transparent",
                      )}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
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
              {category ? "Save" : "Create"}
            </Button>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
