import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Shad } from "@repo/ui";
import { FormField } from "@/components/common/FormField";
import {
  useCreateSubcategory,
  useUpdateSubcategory,
} from "@/hooks/useSubcategory";
import { SubcategorySchema, type SubcategoryInput } from "@/shared/schemas";
import type { Subcategory } from "@/shared/models";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  subcategory?: Subcategory | null;
};

export const SubcategoryForm = ({
  open,
  onOpenChange,
  categoryId,
  subcategory,
}: Props) => {
  const createSubcategory = useCreateSubcategory(categoryId);
  const updateSubcategory = useUpdateSubcategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubcategoryInput>({
    resolver: zodResolver(SubcategorySchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ name: subcategory?.name ?? "" });
    }
  }, [open, subcategory, reset]);

  const onSubmit = async (value: SubcategoryInput) => {
    if (subcategory) {
      await updateSubcategory.mutateAsync({ id: subcategory.id, data: value });
    } else {
      await createSubcategory.mutateAsync(value);
    }
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="max-w-sm">
        <Shad.DialogHeader>
          <Shad.DialogTitle>
            {subcategory ? "Edit Subcategory" : "New Subcategory"}
          </Shad.DialogTitle>
        </Shad.DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Name"
            placeholder="e.g. Soft Drinks"
            registration={register("name")}
            error={errors.name}
            autoFocus
            required
          />

          <Shad.DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              isSubmitting={isSubmitting}
            >
              {subcategory ? "Save" : "Create"}
            </Button>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
