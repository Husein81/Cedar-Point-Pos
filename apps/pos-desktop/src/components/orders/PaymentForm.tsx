import { Button, Icon, Input, Separator, Shad, Badge } from "@repo/ui";
import { cn } from "@repo/ui";
import { useEffect, useMemo, useState } from "react";
import { PaymentMethod } from "@repo/types";
import { formatPrice, generateQuickCashAmounts } from "./config";
import { useModalStore } from "@/store/modalStore";
import { useActiveTenantCurrencies } from "@/hooks/useCurrency";

type Props = {
  total: number;
  onConfirm: (
    method: PaymentMethod,
    amountTendered: number,
    currencyCode?: string,
    exchangeRate?: number
  ) => void;
};

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: string;
}[] = [
  { value: "CASH", label: "Cash", icon: "Banknote" },
  { value: "CARD", label: "Card", icon: "CreditCard" },
  { value: "CREDIT", label: "Credit", icon: "Wallet" },
  { value: "ONLINE", label: "Online", icon: "Smartphone" },
];

export const PaymentForm = ({ total, onConfirm }: Props) => {
  const { closeModal } = useModalStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
  const [amountTendered, setAmountTendered] = useState<number>(total);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>("");

  // Fetch active currencies for payment
  const { data: activeCurrencies = [], isLoading: isLoadingCurrencies } =
    useActiveTenantCurrencies();

  // Find the base/default currency
  const baseCurrency = useMemo(() => {
    return activeCurrencies.find((c) => c.isDefault) || activeCurrencies[0];
  }, [activeCurrencies]);

  // Selected currency details
  const selectedCurrency = useMemo(() => {
    if (!selectedCurrencyCode) return baseCurrency;
    return activeCurrencies.find((c) => c.currencyCode === selectedCurrencyCode);
  }, [activeCurrencies, selectedCurrencyCode, baseCurrency]);

  // Calculate exchange rate safely
  const exchangeRate = useMemo(() => {
    if (!selectedCurrency || selectedCurrency.exchangeRate === null || selectedCurrency.exchangeRate === undefined) {
      return 1;
    }
    const rate = parseFloat(selectedCurrency.exchangeRate.toString());
    return isNaN(rate) ? 1 : rate;
  }, [selectedCurrency]);

  const totalInCurrency = total * exchangeRate;

  // Reset when modal opens / total changes
  useEffect(() => {
    setSelectedMethod("CASH");
    setAmountTendered(total);
    if (baseCurrency) {
      setSelectedCurrencyCode(baseCurrency.currencyCode);
    }
  }, [total, baseCurrency]);

  const quickAmounts = useMemo(() => generateQuickCashAmounts(totalInCurrency), [totalInCurrency]);

  const changeDue =
    selectedMethod === "CASH" ? Math.max(0, amountTendered - totalInCurrency) : 0;

  const isValid = selectedMethod !== "CASH" || amountTendered >= totalInCurrency;

  // The actual amount to be paid (accounting truth, always totalInCurrency regardless of UI convenience inputs)
  const finalPaidAmount = totalInCurrency;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(
      selectedMethod,
      finalPaidAmount,
      selectedCurrency?.currencyCode,
      exchangeRate
    );
    closeModal();
  };

  // Get currency symbol for display
  const currencySymbol = useMemo(() => {
    return selectedCurrency?.currency?.symbol || selectedCurrency?.currencyCode || "$";
  }, [selectedCurrency]);

  // Guard against empty or loading state - NOW AFTER ALL HOOKS
  if (isLoadingCurrencies && activeCurrencies.length === 0) {
    return (
      <div className="sm:max-w-md p-4 text-center">
        <p className="text-muted-foreground">Loading currency information...</p>
      </div>
    );
  }

  return (
    <div className="sm:max-w-md">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Icon name="CreditCard" className="w-5 h-5 text-primary" />
        </div>
        <Shad.DialogTitle>Complete Payment</Shad.DialogTitle>
      </div>

      <div className="space-y-5 pt-4">
        {/* Total */}
        <div className="text-center py-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">Total Due (Base)</p>
          <p className="text-4xl font-bold text-primary">
            ${formatPrice(total)}
          </p>
          {selectedCurrency && !selectedCurrency.isDefault && (
            <p className="text-lg text-muted-foreground mt-1">
              ≈ {currencySymbol} {formatPrice(totalInCurrency)}
            </p>
          )}
        </div>

        {/* Currency Selection */}
        {activeCurrencies.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Payment Currency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {activeCurrencies.map((currency) => (
                <Button
                  key={currency.currencyCode}
                  variant={
                    selectedCurrencyCode === currency.currencyCode
                      ? "default"
                      : "outline"
                  }
                  className="flex flex-col gap-1 h-auto py-2"
                  onClick={() => {
                    setSelectedCurrencyCode(currency.currencyCode);
                    // Reset amount tendered to new currency total
                    const newRate = parseFloat(currency.exchangeRate?.toString() || "1");
                    setAmountTendered(total * newRate);
                  }}
                >
                  <span className="text-sm font-medium">
                    {currency.currency?.symbol || currency.currencyCode}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currency.currencyCode}
                  </span>
                  {currency.isDefault && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Base
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <Button
                key={method.value}
                variant={
                  selectedMethod === method.value ? "default" : "outline"
                }
                className="flex flex-col gap-1 h-auto py-3"
                onClick={() => setSelectedMethod(method.value)}
              >
                <Icon name={method.icon} className="w-5 h-5" />
                <span className="text-xs">{method.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Cash Flow */}
        {selectedMethod === "CASH" && (
          <>
            <Separator />

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                Amount Tendered ({selectedCurrency?.currencyCode || "USD"})
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  min={0}
                  value={amountTendered}
                  onChange={(e) =>
                    setAmountTendered(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="pl-7 text-xl font-semibold h-12 text-center"
                  autoFocus
                />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAmountTendered(totalInCurrency)}
                  className="text-xs"
                >
                  Exact
                </Button>

                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmountTendered(amount)}
                    className="text-xs"
                  >
                    {currencySymbol}{formatPrice(amount)}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Change */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Change Due ({selectedCurrency?.currencyCode || "USD"})</span>
              <span
                className={cn(
                  "text-2xl font-bold",
                  changeDue > 0 ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {currencySymbol}{formatPrice(changeDue)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex pt-4 gap-2">
        <Button variant="outline" type="button" onClick={closeModal}>
          Cancel
        </Button>

        <Button
          onClick={handleConfirm}
          disabled={!isValid || isLoadingCurrencies}
          className="min-w-32"
        >
          <Icon name="Check" className="w-4 h-4" />
          {selectedMethod === "CASH"
            ? `Pay ${currencySymbol}${formatPrice(totalInCurrency)}`
            : "Process Payment"}
        </Button>
      </div>
    </div>
  );
};
