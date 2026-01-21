import {
  useDeleteTenantCurrency,
  useUpdateTenantCurrency,
  useSetBaseCurrency,
} from "@/hooks/useCurrency";
import { useModalStore } from "@/store/modalStore";
import type { TenantCurrency } from "@repo/types";
import { Icon, Shad } from "@repo/ui";
import { CurrencyForm } from "./CurrencyForm";
import { SetBaseCurrencyDialog } from "./SetBaseCurrencyDialog";
import { useState } from "react";

type Props = {
  tenantCurrency: TenantCurrency;
  baseCurrencyCode: string;
};

export const CurrencyActions = ({ tenantCurrency, baseCurrencyCode }: Props) => {
  const openModal = useModalStore((state) => state.openModal);
  const deleteMutation = useDeleteTenantCurrency();
  const updateMutation = useUpdateTenantCurrency();
  const setBaseMutation = useSetBaseCurrency();
  const [showBaseDialog, setShowBaseDialog] = useState(false);

  const isBaseCurrency = tenantCurrency.currencyCode === baseCurrencyCode;

  const handleEdit = () => {
    openModal(
      `Edit ${tenantCurrency.currencyCode} Currency`,
      <CurrencyForm tenantCurrency={tenantCurrency} />
    );
  };

  const handleToggleActive = async () => {
    if (isBaseCurrency && tenantCurrency.isActive) {
      // Cannot deactivate base currency
      alert("Cannot deactivate the base currency. Change the base currency first.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: tenantCurrency.id,
        data: {
          isActive: !tenantCurrency.isActive,
        },
      });
    } catch (error) {
      console.error("Failed to toggle currency status:", error);
    }
  };

  const handleSetAsBase = () => {
    setShowBaseDialog(true);
  };

  const handleConfirmSetBase = async () => {
    try {
      await setBaseMutation.mutateAsync(tenantCurrency.currencyCode);
      setShowBaseDialog(false);
    } catch (error) {
      console.error("Failed to set base currency:", error);
    }
  };

  const handleDelete = async () => {
    if (isBaseCurrency) {
      alert("Cannot delete the base currency. Change the base currency first.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${tenantCurrency.currencyCode}?\n\nNote: This will fail if this currency has been used in any payments.`
      )
    ) {
      try {
        await deleteMutation.mutateAsync(tenantCurrency.id);
      } catch (error) {
        console.error("Failed to delete currency:", error);
      }
    }
  };

  return (
    <>
      <Shad.DropdownMenu>
        <Shad.DropdownMenuTrigger>
          <Icon name="Ellipsis" className="size-4" />
        </Shad.DropdownMenuTrigger>
        <Shad.DropdownMenuContent align="end">
          <Shad.DropdownMenuItem onClick={handleEdit}>
            <Icon name="SquarePen" className="h-4 w-4" />
            Edit Exchange Rate
          </Shad.DropdownMenuItem>

          {!isBaseCurrency && (
            <Shad.DropdownMenuItem onClick={handleToggleActive}>
              <Icon
                name={tenantCurrency.isActive ? "EyeOff" : "Eye"}
                className="h-4 w-4"
              />
              {tenantCurrency.isActive ? "Deactivate" : "Activate"}
            </Shad.DropdownMenuItem>
          )}

          {!isBaseCurrency && tenantCurrency.isActive && (
            <Shad.DropdownMenuItem onClick={handleSetAsBase}>
              <Icon name="Star" className="h-4 w-4" />
              Set as Base Currency
            </Shad.DropdownMenuItem>
          )}

          {!isBaseCurrency && (
            <>
              <Shad.DropdownMenuSeparator />
              <Shad.DropdownMenuItem onClick={handleDelete} variant="destructive">
                <Icon name="Trash2" className="h-4 w-4" />
                Delete
              </Shad.DropdownMenuItem>
            </>
          )}
        </Shad.DropdownMenuContent>
      </Shad.DropdownMenu>

      {/* Set Base Currency Confirmation Dialog */}
      <SetBaseCurrencyDialog
        open={showBaseDialog}
        onOpenChange={setShowBaseDialog}
        currencyCode={tenantCurrency.currencyCode}
        currencyName={tenantCurrency.currency?.name || tenantCurrency.currencyCode}
        onConfirm={handleConfirmSetBase}
        isLoading={setBaseMutation.isPending}
      />
    </>
  );
};
