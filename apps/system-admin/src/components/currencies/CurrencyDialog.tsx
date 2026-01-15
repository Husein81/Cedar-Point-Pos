"use client";

import { useForm } from "@tanstack/react-form";
import { Button, InputField, Shad } from "@repo/ui";
import { useCreateCurrency, useUpdateCurrency } from "@/hooks/currency";
import type { Currency } from "@repo/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: Currency;
};

export function CurrencyDialog({ open, onOpenChange, currency }: Props) {
  const createCurrency = useCreateCurrency();
  const updateCurrency = useUpdateCurrency();

  const isEditing = !!currency;

  const form = useForm({
    defaultValues: {
      code: currency?.code || "",
      name: currency?.name || "",
      symbol: currency?.symbol || "",
      decimalPlaces: currency?.decimalPlaces?.toString() || "2",
    },
    onSubmit: async ({ value }) => {
      try {
        if (isEditing && currency) {
          await updateCurrency.mutateAsync({
            code: currency.code,
            data: {
              name: value.name,
              symbol: value.symbol || undefined,
              decimalPlaces: parseInt(value.decimalPlaces, 10),
            },
          });
        } else {
          await createCurrency.mutateAsync({
            code: value.code.toUpperCase(),
            name: value.name,
            symbol: value.symbol || undefined,
            decimalPlaces: parseInt(value.decimalPlaces, 10),
          });
        }
        form.reset();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to save currency:", error);
      }
    },
  });

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const isPending = createCurrency.isPending || updateCurrency.isPending;
  const error = createCurrency.error || updateCurrency.error;

  return (
    <Shad.Dialog open={open} onOpenChange={handleClose}>
      <Shad.DialogContent>
        <Shad.DialogHeader>
          <Shad.DialogTitle>
            {isEditing ? `Edit ${currency.code}` : "Add New Currency"}
          </Shad.DialogTitle>
          <Shad.DialogDescription>
            {isEditing
              ? "Update the currency details. The currency code cannot be changed."
              : "Add a new currency to the global reference table. This currency will be available for all tenants to configure."}
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error?.message || "Failed to save currency"}
            </div>
          )}

          {/* Currency Code - only for new currencies */}
          {!isEditing && (
            <form.Field
              name="code"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Currency code is required";
                  if (!/^[A-Za-z]{3}$/.test(value))
                    return "Code must be 3 letters (ISO 4217)";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <InputField
                  label="Currency Code"
                  field={field}
                  placeholder="e.g., USD, EUR, LBP"
                  required
                />
              )}
            </form.Field>
          )}

          {/* Display code when editing */}
          {isEditing && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Currency Code</p>
              <p className="font-mono font-medium">{currency.code}</p>
            </div>
          )}

          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                !value ? "Currency name is required" : undefined,
            }}
          >
            {(field) => (
              <InputField
                label="Currency Name"
                field={field}
                placeholder="e.g., United States Dollar"
                required
              />
            )}
          </form.Field>

          <form.Field name="symbol">
            {(field) => (
              <InputField
                label="Symbol"
                field={field}
                placeholder="e.g., $, €, ل.ل"
              />
            )}
          </form.Field>

          <form.Field
            name="decimalPlaces"
            validators={{
              onChange: ({ value }) => {
                const num = parseInt(value, 10);
                if (isNaN(num)) return "Must be a number";
                if (num < 0 || num > 6) return "Must be between 0 and 6";
                return undefined;
              },
            }}
          >
            {(field) => (
              <InputField
                label="Decimal Places"
                field={field}
                type="number"
                placeholder="e.g., 2"
              />
            )}
          </form.Field>

          <p className="text-xs text-muted-foreground">
            Decimal places: 2 for most currencies, 0 for currencies like LBP
            that do not use cents.
          </p>

          <Shad.DialogFooter>
            <Button variant="outline" onClick={handleClose} type="button">
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || isPending}
                  isSubmitting={isPending}
                >
                  {isEditing ? "Update" : "Create"}
                </Button>
              )}
            </form.Subscribe>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
}
