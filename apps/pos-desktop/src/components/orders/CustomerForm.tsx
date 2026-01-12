import type { CustomerSummary } from "@/dto/customer.dto";
import { useCreateCustomer } from "@/hooks/useCustomer";
import { useModalStore } from "@/store/modalStore";
import { Button, Icon, InputField, Shad } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

type Props = {
  onCustomerCreated: (customer: CustomerSummary) => void;
};

export const CustomerForm = ({ onCustomerCreated }: Props) => {
  const { closeModal } = useModalStore();

  const createCustomer = useCreateCustomer();

  const form = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const customer = await createCustomer.mutateAsync({
          name: value.name.trim(),
          phone: value.phone.trim(),
          email: value.email.trim() || null,
        });
        onCustomerCreated(customer);
        closeModal();
      } catch (err) {
        console.error(err);
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
            !value.trim() ? "Name is required" : undefined,
        }}
      >
        {(field) => (
          <InputField
            label="Name"
            placeholder="Enter customer name"
            field={field}
            required
            autoFocus
          />
        )}
      </form.Field>

      <form.Field
        name="phone"
        validators={{
          onChange: ({ value }) =>
            !value.trim() ? "Phone number is required" : undefined,
        }}
      >
        {(field) => (
          <InputField
            label="Phone"
            placeholder="Enter phone number"
            field={field}
            required
            type="tel"
          />
        )}
      </form.Field>

      <form.Field name="email">
        {(field) => (
          <InputField
            label="Email (optional)"
            placeholder="Enter email address"
            field={field}
            type="email"
          />
        )}
      </form.Field>

      <Shad.DialogFooter className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={closeModal}
          disabled={createCustomer.isPending || form.state.isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-38"
          isSubmitting={createCustomer.isPending || form.state.isSubmitting}
          disabled={createCustomer.isPending || form.state.isSubmitting}
        >
          <Icon name="UserPlus" className="w-4 h-4" />
          Add Customer
        </Button>
      </Shad.DialogFooter>
    </form>
  );
};
