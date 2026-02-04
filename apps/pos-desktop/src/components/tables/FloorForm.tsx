"use client";
import { useForm } from "@tanstack/react-form";
import { Button, InputField, Icon } from "@repo/ui";
import type {
  CreateFloorDto,
  UpdateFloorDto,
  FloorWithTableCount,
} from "@/dto/tables.dto";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { useCreateFloor, useUpdateFloor } from "@/hooks/useFloor";

interface FloorFormProps {
  floor?: FloorWithTableCount;
}

export function FloorForm({ floor }: FloorFormProps) {
  const { closeModal } = useModalStore();
  const { branchId } = useBranchStore();

  const createFloorMutation = useCreateFloor();
  const updateFloorMutation = useUpdateFloor();

  const handleFloorSubmit = (data: CreateFloorDto | UpdateFloorDto) => {
    if (floor) {
      updateFloorMutation.mutate({
        id: floor.id,
        data: data as UpdateFloorDto,
      });
    } else {
      createFloorMutation.mutate(data as CreateFloorDto);
    }
  };

  const isSubmitting =
    createFloorMutation.isPending || updateFloorMutation.isPending;

  const form = useForm({
    defaultValues: {
      name: floor?.name || "",
      order: floor?.order?.toString() || "0",
    },
    onSubmit: async ({ value }) => {
      const data = floor
        ? ({
            name: value.name.trim(),
            order: parseInt(value.order) || 0,
          } as UpdateFloorDto)
        : ({
            name: value.name.trim(),
            order: parseInt(value.order) || 0,
            branchId: branchId!,
          } as CreateFloorDto);

      handleFloorSubmit(data);
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
        children={(field) => (
          <InputField
            label="Floor Name"
            field={field}
            placeholder="e.g., Ground Floor, Terrace, VIP Section"
            required
          />
        )}
      />

      <form.Field
        name="order"
        children={(field) => (
          <InputField
            label="Display Order"
            field={field}
            type="number"
            min="0"
            placeholder="e.g., 0"
            subLabel="Lower numbers appear first in the floor tabs"
          />
        )}
      />

      <div className="flex justify-between gap-2 pt-4">
        {/* <div>
          {floor && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isSubmitting}
            >
              <Icon name="Trash2" className="mr-2 h-4 w-4" />
              Delete Floor
            </Button>
          )}
        </div> */}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Icon name="LoaderCircle" className="mr-2 h-4 w-4 animate-spin" />
            )}
            {floor ? "Update Floor" : "Create Floor"}
          </Button>
        </div>
      </div>
    </form>
  );
}
