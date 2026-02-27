import {
  useCreateSupplier,
  useUpdateSupplier,
} from "@/hooks/useSupplier";
import { useModalStore } from "@/store/modalStore";
import { Button, InputField, TextareaField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import type { SupplierDetails, SupplierSummary } from "@/dto/supplier.dto";

type Props = {
  supplier?: SupplierDetails;
  /** Called after successful creation with the new supplier. Used by SupplierSelector to auto-select. */
  onSupplierCreated?: (supplier: SupplierSummary) => void;
};

export const SupplierForm = ({ supplier, onSupplierCreated }: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const form = useForm({
    defaultValues: {
      name: supplier?.name || "",
      companyName: supplier?.companyName || "",
      phone: supplier?.phone || "",
      email: supplier?.email || "",
      address: supplier?.address || "",
      category: supplier?.category || "",
      notes: supplier?.notes || "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (supplier) {
          await updateMutation.mutateAsync({
            id: supplier.id,
            data: {
              name: value.name,
              companyName: value.companyName || null,
              phone: value.phone || null,
              email: value.email || null,
              address: value.address || null,
              category: value.category || null,
              notes: value.notes || null,
            },
          });
        } else {
          const created = await createMutation.mutateAsync({
            name: value.name,
            companyName: value.companyName || null,
            phone: value.phone || null,
            email: value.email || null,
            address: value.address || null,
            category: value.category || null,
            notes: value.notes || null,
          });
          onSupplierCreated?.(created);
        }
        closeModal();
      } catch (error) {
        console.error("Failed to save supplier:", error);
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
      >
        {(field) => (
          <InputField
            label="Name"
            field={field}
            placeholder="Enter supplier name"
            required
          />
        )}
      </form.Field>

      <form.Field name="companyName">
        {(field) => (
          <InputField
            label="Company Name"
            field={field}
            placeholder="Enter company name"
          />
        )}
      </form.Field>

      <form.Field name="phone">
        {(field) => (
          <InputField
            label="Phone"
            field={field}
            placeholder="Enter phone number"
          />
        )}
      </form.Field>

      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) => {
            if (!value || value.trim().length === 0) return undefined;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return !emailRegex.test(value)
              ? "Invalid email address"
              : undefined;
          },
        }}
      >
        {(field) => (
          <InputField
            label="Email"
            field={field}
            placeholder="Enter email address"
            type="email"
          />
        )}
      </form.Field>

      <form.Field name="address">
        {(field) => (
          <TextareaField
            label="Address"
            field={field}
            placeholder="Enter supplier address"
          />
        )}
      </form.Field>

      <form.Field name="category">
        {(field) => (
          <InputField
            label="Category"
            field={field}
            placeholder="e.g. Food, Beverages, Equipment"
          />
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <TextareaField
            label="Notes"
            field={field}
            placeholder="Any additional notes"
          />
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          type="submit"
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {supplier ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
