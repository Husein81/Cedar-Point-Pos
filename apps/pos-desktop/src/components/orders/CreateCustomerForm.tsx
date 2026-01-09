import { useState } from "react";
import { Button, Icon, Shad, InputField } from "@repo/ui";
import { useCreateCustomer } from "@/hooks/useCustomer";
import type { CustomerSummary } from "@/dto/customer.dto";
import { useForm } from "@tanstack/react-form";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customer: CustomerSummary) => void;
};

export const CreateCustomerForm = ({
  open,
  onOpenChange,
  onCustomerCreated,
}: Props) => {
  const [error, setError] = useState<string | null>(null);

  const createCustomer = useCreateCustomer();

  const form = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const customer = await createCustomer.mutateAsync({
          name: value.name.trim(),
          phone: value.phone.trim(),
          email: value.email.trim() || null,
        });
        onCustomerCreated(customer);
        handleClose();
      } catch (err) {
        if (err instanceof Error) {
          // Handle duplicate phone error from backend
          if (err.message.includes("already exists")) {
            setError("A customer with this phone number already exists");
          } else {
            setError(err.message);
          }
        } else {
          setError("Failed to create customer. Please try again.");
        }
      }
    },
  });

  const handleClose = () => {
    form.reset();
    setError(null);
    onOpenChange(false);
  };

  return (
    <Shad.Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) handleClose();
        else onOpenChange(true);
      }}
    >
      <Shad.DialogContent className="sm:max-w-md">
        <Shad.DialogHeader>
          <Shad.DialogTitle className="flex items-center gap-2">
            <Icon name="UserPlus" className="w-5 h-5" />
            Add New Customer
          </Shad.DialogTitle>
          <Shad.DialogDescription>
            Create a new customer for this order. Phone number is required.
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md flex items-center gap-2">
              <Icon name="AlertCircle" className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

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

          <Shad.DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createCustomer.isPending || form.state.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCustomer.isPending || form.state.isSubmitting}
            >
              {createCustomer.isPending || form.state.isSubmitting ? (
                <>
                  <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Icon name="UserPlus" className="w-4 h-4" />
                  Add Customer
                </>
              )}
            </Button>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
