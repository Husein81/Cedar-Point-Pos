import { CurrencyForm } from "@/components/currency/CurrencyForm";
import TitleBar from "@/components/title-bar";
import { getCurrencyColumns } from "@/constants/columns/currencyColumn";
import { useTenantCurrencies } from "@/hooks/useCurrency";
import { useModalStore } from "@/store/modalStore";
import { Button, DataTable, Icon, Badge } from "@repo/ui";
import { useState, useMemo } from "react";

export default function CurrenciesSettingsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: currencyData, isLoading, refetch } = useTenantCurrencies();
  const openModal = useModalStore((state) => state.openModal);

  const baseCurrencyCode = currencyData?.baseCurrencyCode || "USD";
  const currencies = currencyData?.currencies || [];

  const columns = getCurrencyColumns(baseCurrencyCode);

  // Get list of already configured currency codes for filtering in form
  const existingCurrencyCodes = useMemo(() => {
    return currencies.map((c) => c.currencyCode);
  }, [currencies]);

  const handleAddCurrency = () => {
    openModal(
      "Add Currency",
      <CurrencyForm existingCurrencyCodes={existingCurrencyCodes} />,
    );
  };

  // Map currencies to include a top-level searchable name for DataTable
  const tableData = useMemo(() => {
    return currencies.map((c) => ({
      ...c,
      searchName: c.currency?.name || "",
    }));
  }, [currencies]);

  // Calculate stats
  const activeCurrencies = currencies.filter((c) => c.isActive).length;
  const totalCurrencies = currencies.length;

  return (
    <div className="space-y-4">
      <TitleBar
        title="Currency Settings"
        subtitle="Manage currencies and exchange rates for your business"
      />

      {/* Currency Stats */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Icon name="Landmark" className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">Base Currency:</span>
          <Badge variant="outline" className="font-mono">
            {baseCurrencyCode}
          </Badge>
        </div>
        <div className="border-l border-border h-6" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active:</span>
          <span className="font-medium">
            {activeCurrencies} / {totalCurrencies}
          </span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Icon
          name="Info"
          className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Multi-Currency Support
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Configure currencies for your POS. Exchange rates are set manually
            and used for payment processing. The base currency (
            {baseCurrencyCode}) has a fixed rate of 1.00 and all other rates are
            relative to it.
          </p>
        </div>
      </div>

      <DataTable
        isLoading={isLoading}
        columns={columns}
        data={tableData}
        onRefetch={refetch}
        actions={
          <Button onClick={handleAddCurrency} iconName="Plus">
            Add Currency
          </Button>
        }
        search={{
          term: searchQuery,
          onTermChange: setSearchQuery,
          keys: ["currencyCode", "searchName"],
        }}
      />
    </div>
  );
}
