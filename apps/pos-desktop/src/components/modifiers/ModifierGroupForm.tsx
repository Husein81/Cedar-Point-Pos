import {
  useCreateModifierGroup,
  useUpdateModifierGroup,
} from "@/hooks/useModifierGroupApi";
import { useModalStore } from "@/store/modalStore";
import { ModifierGroupItem } from "@/types/modifiers";
import { ModifierType } from "@repo/types";
import { Button, InputField, SelectField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";

interface Props {
  editingGroup?: ModifierGroupItem;
}

export const ModifierGroupForm = ({ editingGroup }: Props) => {
  const { closeModal } = useModalStore();
  const isEditMode = Boolean(editingGroup);

  const createGroup = useCreateModifierGroup();
  const updateGroup = useUpdateModifierGroup();

  const isLoading = createGroup.isPending || updateGroup.isPending;

  const form = useForm({
    defaultValues: {
      name: "",
      type: "SINGLE" as ModifierType,
    },
    onSubmit: async ({ value }) => {
      if (!value.name.trim()) return;

      try {
        if (isEditMode && editingGroup) {
          await updateGroup.mutateAsync({
            groupId: editingGroup.id,
            data: {
              name: value.name.trim(),
              type: value.type,
            },
          });
        } else {
          await createGroup.mutateAsync({
            data: {
              name: value.name.trim(),
              type: value.type,
            },
          });
        }

        closeModal();
      } catch (error) {
        console.error("Failed to save modifier group:", error);
      }
    },
  });

  /**
   * ----------------------------------------
   * Sync form with editingGroup (CRITICAL)
   * ----------------------------------------
   */
  useEffect(() => {
    if (editingGroup) {
      form.reset({
        name: editingGroup.name,
        type: editingGroup.type as ModifierType,
      });
    } else {
      form.reset({
        name: "",
        type: "SINGLE",
      });
    }
  }, [editingGroup, form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      {/* Name */}
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) =>
            !value || !value.trim()
              ? "Group name is required"
              : value.length > 50
                ? "Name must be 50 characters or less"
                : undefined,
        }}
      >
        {(field) => (
          <InputField
            label="Group Name"
            placeholder="e.g. Size, Toppings, Cooking Level"
            field={field}
            required
          />
        )}
      </form.Field>

      {/* Type */}
      <form.Field name="type">
        {(field) => (
          <SelectField
            label="Selection Type"
            field={field}
            options={[
              {
                value: "SINGLE",
                label: "Single Choice (exactly one required)",
              },
              {
                value: "MULTIPLE",
                label: "Multiple Choice (0 or more)",
              },
            ]}
          />
        )}
      </form.Field>

      {/* Info */}
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          💡{" "}
          {form.getFieldValue("type") === "SINGLE"
            ? "Examples: Size (S/M/L), Temperature (Rare/Medium/Well)"
            : "Examples: Toppings, Add-ons, Extras"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={closeModal}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isSubmitting={isLoading}
          disabled={isLoading || !form.state.isValid}
          className="flex-1"
        >
          {isEditMode ? "Update Group" : "Create Group"}
        </Button>
      </div>
    </form>
  );
};
