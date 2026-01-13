import {
  useCreateTenantCurrency,
  useUpdateTenantCurrency,
  useAllCurrencies,
} from "@/hooks/useCurrency";
import { useModalStore } from "@/store/modalStore";
import type { TenantCurrency, Currency } from "@repo/types";
import { Button, InputField, SelectField, SwitchField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";

type Props = {
  tenantCurrency?: TenantCurrency;
  existingCurrencyCodes?: string[];
};

export const CurrencyForm = ({
  tenantCurrency,
  existingCurrencyCodes = [],
}: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const createMutation = useCreateTenantCurrency();
  const updateMutation = useUpdateTenantCurrency();

  // Fetch all available currencies from reference table
  const { data: allCurrencies = [], isLoading: isLoadingCurrencies } =
    useAllCurrencies();

  // Filter out currencies that are already configured for this tenant
  const availableCurrencies = useMemo(() => {
    if (tenantCurrency) {
      // When editing, show all currencies (the current one is already selected)
      return allCurrencies;
    }
    // When creating, filter out already configured currencies
    return allCurrencies.filter(
      (c: Currency) => !existingCurrencyCodes.includes(c.code)
    );
  }, [allCurrencies, existingCurrencyCodes, tenantCurrency]);

  const currencyOptions = useMemo(() => {
    return availableCurrencies.map((c: Currency) => ({
      value: c.code,
      label: `${c.code} - ${c.name}${c.symbol ? ` (${c.symbol})` : ""}`,
    }));
  }, [availableCurrencies]);

  const isEditing = !!tenantCurrency;

  const form = useForm({
    defaultValues: {
      currencyCode: tenantCurrency?.currencyCode || "",
      exchangeRate: tenantCurrency?.exchangeRate?.toString() || "1",
      isActive: tenantCurrency?.isActive ?? true,
    },
    onSubmit: async ({ value }) => {
      try {
        const exchangeRate = parseFloat(value.exchangeRate);

        if (isEditing && tenantCurrency) {
          await updateMutation.mutateAsync({
            id: tenantCurrency.id,
            data: {
              exchangeRate,
              isActive: value.isActive,
            },
          });
        } else {
          await createMutation.mutateAsync({
            currencyCode: value.currencyCode.toUpperCase(),
            exchangeRate,
            isActive: value.isActive,
          });
        }
        closeModal();
      } catch (error) {
        console.error("Failed to save currency:", error);
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
      {/* Currency Selection - only for new currencies */}
      {!isEditing && (
        <form.Field
          name="currencyCode"
          validators={{
            onChange: ({ value }) =>
              !value || value.trim().length === 0
                ? "Currency is required"
                : undefined,
          }}
        >
          {(field) => (
            <SelectField
              label="Currency"
              field={field}
              options={currencyOptions}
              placeholder={
                isLoadingCurrencies
                  ? "Loading currencies..."
                  : "Select a currency"
              }
            />
          )}
        </form.Field>
      )}

      {/* Display currency info when editing */}
      {isEditing && tenantCurrency?.currency && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Currency</p>
          <p className="font-medium">
            {tenantCurrency.currencyCode} - {tenantCurrency.currency.name}
            {tenantCurrency.currency.symbol &&
              ` (${tenantCurrency.currency.symbol})`}
          </p>
        </div>
      )}

      {/* Exchange Rate */}
      <form.Field
        name="exchangeRate"
        validators={{
          onChange: ({ value }) => {
            const rate = parseFloat(value);
            if (isNaN(rate)) return "Exchange rate must be a number";
            if (rate <= 0) return "Exchange rate must be positive";
            return undefined;
          },
        }}
      >
        {(field) => (
          <InputField
            label="Exchange Rate"
            field={field}
            type="number"
            placeholder="Enter exchange rate"
            required
          />
        )}
      </form.Field>

      <p className="text-xs text-muted-foreground">
        Exchange rate relative to your base currency. For example, if base is
        USD and this is LBP, enter the rate like 89500.
      </p>

      {/* Active Toggle */}
      <form.Field name="isActive">
        {(field) => (
          <SwitchField
            label="Active"
            field={field}
            subLabel="Active currencies can be used for payments in POS"
          />
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-24"
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {isEditing ? "Update" : "Add"}
        </Button>
      </div>
    </form>
  );
};
