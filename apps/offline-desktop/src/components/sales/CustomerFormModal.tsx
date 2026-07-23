import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button, Icon, Shad } from "@repo/ui";
import { FormField } from "@/components/common/FormField";
import { useModalStore } from "@/store/modalStore";
import { useCreateCustomer } from "@/hooks/useCustomer";
import { CustomerSchema } from "@/shared/schemas";
import type { Customer } from "@/shared/models";

type FormValues = z.input<typeof CustomerSchema>;
type FormOutput = z.output<typeof CustomerSchema>;

type Props = {
  onCustomerCreated: (customer: Customer) => void;
};

export const CustomerFormModal = ({ onCustomerCreated }: Props) => {
  const { closeModal } = useModalStore();
  const createCustomer = useCreateCustomer();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: { name: "", phone: null, email: null, address: null },
  });

  const onSubmit = async (value: FormOutput) => {
    const customer = await createCustomer.mutateAsync(value);
    onCustomerCreated(customer);
    closeModal();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Name"
        placeholder="Enter customer name"
        registration={register("name")}
        error={errors.name}
        autoFocus
        required
      />
      <FormField
        label="Phone"
        placeholder="Enter phone number"
        registration={register("phone")}
        error={errors.phone}
      />
      <FormField
        label="Email (optional)"
        placeholder="Enter email address"
        registration={register("email")}
        error={errors.email}
      />
      <FormField
        label="Address (optional)"
        placeholder="Enter address"
        registration={register("address")}
        error={errors.address}
      />

      <Shad.DialogFooter className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button type="submit" className="w-38" disabled={isSubmitting} isSubmitting={isSubmitting}>
          <Icon name="UserPlus" className="w-4 h-4" />
          Add Customer
        </Button>
      </Shad.DialogFooter>
    </form>
  );
};
