import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomer";
import { useModalStore } from "@/store/modalStore";
import { Button, InputField, TextareaField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import type { CustomerDetails } from "@/dto/customer.dto";

type Props = {
  customer?: CustomerDetails;
};

export const CustomerForm = ({ customer }: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const form = useForm({
    defaultValues: {
      name: customer?.name || "",
      phone: customer?.phone || "",
      email: customer?.email || "",
      address: customer?.address || "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (customer) {
          await updateMutation.mutateAsync({
            id: customer.id,
            data: {
              name: value.name,
              phone: value.phone || undefined,
              email: value.email || undefined,
              address: value.address || undefined,
            },
          });
        } else {
          await createMutation.mutateAsync({
            name: value.name,
            phone: value.phone,
            email: value.email || undefined,
            address: value.address || undefined,
          });
        }
        closeModal();
      } catch (error) {
        console.error("Failed to save customer:", error);
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
            placeholder="Enter customer name"
            required
          />
        )}
      </form.Field>

      <form.Field
        name="phone"
        validators={{
          onChange: ({ value }) =>
            !value || value.trim().length === 0
              ? "Phone is required"
              : undefined,
        }}
      >
        {(field) => (
          <InputField
            label="Phone"
            field={field}
            placeholder="Enter phone number"
            required
          />
        )}
      </form.Field>

      <form.Field name="email">
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
            placeholder="Enter customer address"
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
          {customer ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
