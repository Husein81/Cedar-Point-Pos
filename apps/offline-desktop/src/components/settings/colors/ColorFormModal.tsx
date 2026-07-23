import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Shad } from "@repo/ui";
import { FormField } from "@/components/common/FormField";
import { useCreateColor, useUpdateColor } from "@/hooks/useColor";
import { ColorSchema, type ColorInput } from "@/shared/schemas";
import type { Color } from "@/shared/models";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  color?: Color | null;
};

export const ColorFormModal = ({ open, onOpenChange, color }: Props) => {
  const createColor = useCreateColor();
  const updateColor = useUpdateColor();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ColorInput>({
    resolver: zodResolver(ColorSchema),
    defaultValues: { name: "", hex: "#000000" },
  });

  useEffect(() => {
    if (open) {
      reset({ name: color?.name ?? "", hex: color?.hex ?? "#000000" });
    }
  }, [open, color, reset]);

  const hex = watch("hex");

  const onSubmit = async (value: ColorInput) => {
    if (color) {
      await updateColor.mutateAsync({ id: color.id, data: value });
    } else {
      await createColor.mutateAsync(value);
    }
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="max-w-sm">
        <Shad.DialogHeader>
          <Shad.DialogTitle>{color ? "Edit Color" : "Add Color"}</Shad.DialogTitle>
        </Shad.DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Name"
            placeholder="Enter color name"
            registration={register("name")}
            error={errors.name}
            autoFocus
            required
          />

          <div className="space-y-2">
            <FormField
              label="Hex Color"
              placeholder="#000000"
              registration={register("hex")}
              error={errors.hex}
              required
            />
            <div
              className="w-full h-10 rounded border"
              style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(hex ?? "") ? hex : undefined }}
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
              {color ? "Update" : "Create"}
            </Button>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
