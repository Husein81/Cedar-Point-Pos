import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Shad } from "@repo/ui";
import { FormField } from "@/components/common/FormField";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomer";
import { CustomerSchema, type CustomerInput } from "@/shared/schemas";
import type { Customer } from "@/shared/models";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
};

export const CustomerForm = ({ open, onOpenChange, customer }: Props) => {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: { name: "", phone: null, email: null, address: null },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? "",
        phone: customer?.phone ?? null,
        email: customer?.email ?? null,
        address: customer?.address ?? null,
      });
    }
  }, [open, customer, reset]);

  const onSubmit = async (value: CustomerInput) => {
    if (customer) {
      await updateCustomer.mutateAsync({ id: customer.id, data: value });
    } else {
      await createCustomer.mutateAsync(value);
    }
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="max-w-sm">
        <Shad.DialogHeader>
          <Shad.DialogTitle>
            {customer ? "Edit Customer" : "New Customer"}
          </Shad.DialogTitle>
        </Shad.DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Name"
            registration={register("name")}
            error={errors.name}
            autoFocus
            required
          />
          <FormField
            label="Phone"
            registration={register("phone")}
            error={errors.phone}
          />
          <FormField
            label="Email"
            registration={register("email")}
            error={errors.email}
          />
          <FormField
            label="Address"
            registration={register("address")}
            error={errors.address}
          />

          <Shad.DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} isSubmitting={isSubmitting}>
              {customer ? "Save" : "Create"}
            </Button>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
