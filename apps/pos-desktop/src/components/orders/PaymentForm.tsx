import { Button, Icon, Input, Separator, Shad, Badge } from "@repo/ui";
import { cn } from "@repo/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentMethod } from "@repo/types";
import { formatPrice, generateQuickCashAmounts } from "./config";
import { useModalStore } from "@/store/modalStore";
import { useActiveTenantCurrencies } from "@/hooks/useCurrency";

// Single payment entry for split payments
export type PaymentEntry = {
  id: string;
  method: PaymentMethod;
  amount: number;
  currencyCode: string;
  exchangeRate: number;
  amountInBase: number;
};

type Props = {
  total: number;
  onConfirm: (payments: PaymentEntry[]) => void;
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
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>("");
  const [givenAmount, setGivenAmount] = useState<string>(""); // String for cleaner input UX
  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  const { data: activeCurrencies = [], isLoading: isLoadingCurrencies } =
    useActiveTenantCurrencies();

  // ===== CURRENCY HELPERS =====

  const baseCurrency = useMemo(() => {
    return activeCurrencies.find((c) => c.isDefault) || activeCurrencies[0];
  }, [activeCurrencies]);

  const selectedCurrency = useMemo(() => {
    if (!selectedCurrencyCode) return baseCurrency;
    return activeCurrencies.find(
      (c) => c.currencyCode === selectedCurrencyCode
    );
  }, [activeCurrencies, selectedCurrencyCode, baseCurrency]);

  const exchangeRate = useMemo(() => {
    if (
      !selectedCurrency ||
      selectedCurrency.exchangeRate === null ||
      selectedCurrency.exchangeRate === undefined
    ) {
      return 1;
    }
    const rate = parseFloat(selectedCurrency.exchangeRate.toString());
    return isNaN(rate) ? 1 : rate;
  }, [selectedCurrency]);

  const currencySymbol = useMemo(() => {
    return (
      selectedCurrency?.currency?.symbol ||
      selectedCurrency?.currencyCode ||
      "$"
    );
  }, [selectedCurrency]);

  const getCurrencySymbol = useCallback(
    (code: string) => {
      const currency = activeCurrencies.find((c) => c.currencyCode === code);
      return currency?.currency?.symbol || code;
    },
    [activeCurrencies]
  );

  // ===== PAYMENT CALCULATIONS =====

  // Total paid so far (in base currency)
  const totalPaidInBase = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amountInBase, 0);
  }, [payments]);

  // Remaining to pay (in base currency)
  const remainingInBase = Math.max(0, total - totalPaidInBase);

  // Remaining displayed in current currency (for cashier)
  const remainingInCurrency = remainingInBase * exchangeRate;

  // Parse given amount (what cashier typed)
  const givenValue = parseFloat(givenAmount) || 0;

  // How much of the given amount actually applies (capped at remaining)
  const appliedInCurrency = Math.min(givenValue, remainingInCurrency);
  const appliedInBase = appliedInCurrency / exchangeRate;

  // Change to give back (in the currency cashier entered)
  const changeInCurrency = Math.max(0, givenValue - remainingInCurrency);

  // Is fully paid?
  const isFullyPaid = Math.abs(remainingInBase) < 0.01;

  // Quick cash amounts based on remaining in current currency
  const quickAmounts = useMemo(
    () => generateQuickCashAmounts(remainingInCurrency),
    [remainingInCurrency]
  );

  // ===== EFFECTS =====

  // Initialize currency when available
  useEffect(() => {
    if (baseCurrency && !selectedCurrencyCode) {
      setSelectedCurrencyCode(baseCurrency.currencyCode);
    }
  }, [baseCurrency, selectedCurrencyCode]);

  // Reset form when total changes (new order)
  useEffect(() => {
    setSelectedMethod("CASH");
    setPayments([]);
    setGivenAmount("");
  }, [total]);

  // Pre-fill with exact remaining when currency changes
  useEffect(() => {
    if (!isFullyPaid) {
      setGivenAmount(remainingInCurrency.toFixed(2).replace(/\.00$/, ""));
    }
  }, [selectedCurrencyCode]);

  // ===== HANDLERS =====

  // Add partial payment
  const handleAddPayment = () => {
    if (givenValue <= 0 || isFullyPaid) return;

    const newPayment: PaymentEntry = {
      id: crypto.randomUUID(),
      method: selectedMethod,
      amount: appliedInCurrency,
      currencyCode: selectedCurrency?.currencyCode || "USD",
      exchangeRate: exchangeRate,
      amountInBase: appliedInBase,
    };

    setPayments((prev) => [...prev, newPayment]);
    setGivenAmount(""); // Clear for next entry
  };

  // Remove payment from list
  const handleRemovePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // Pay full remaining in one go
  const handlePayFull = () => {
    if (remainingInBase <= 0) return;

    const newPayment: PaymentEntry = {
      id: crypto.randomUUID(),
      method: selectedMethod,
      amount: remainingInCurrency,
      currencyCode: selectedCurrency?.currencyCode || "USD",
      exchangeRate: exchangeRate,
      amountInBase: remainingInBase,
    };

    setPayments((prev) => [...prev, newPayment]);
    setGivenAmount("");
  };

  // Final confirmation - submit all payments
  const handleConfirm = () => {
    if (!isFullyPaid || payments.length === 0) return;
    onConfirm(payments);
    closeModal();
  };

  // ===== LOADING STATE =====

  if (isLoadingCurrencies && activeCurrencies.length === 0) {
    return (
      <div className="sm:max-w-lg p-4 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // ===== RENDER =====

  return (
    <div className="sm:max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Icon name="CreditCard" className="w-5 h-5 text-primary" />
        </div>
        <Shad.DialogTitle>Payment</Shad.DialogTitle>
      </div>

      <div className="space-y-4 pt-4">
        {/* ===== SUMMARY CARDS ===== */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total */}
          <div className="text-center py-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total
            </p>
            <p className="text-2xl font-bold">${formatPrice(total)}</p>
          </div>

          {/* Remaining */}
          <div
            className={cn(
              "text-center py-3 rounded-lg transition-colors",
              isFullyPaid ? "bg-green-500/10" : "bg-orange-500/10"
            )}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Remaining
            </p>
            <p
              className={cn(
                "text-2xl font-bold",
                isFullyPaid ? "text-green-600" : "text-orange-600"
              )}
            >
              {isFullyPaid ? (
                <span className="flex items-center justify-center gap-1">
                  <Icon name="Check" className="w-5 h-5" />
                  Paid
                </span>
              ) : (
                <>
                  {currencySymbol}
                  {formatPrice(remainingInCurrency)}
                </>
              )}
            </p>
          </div>
        </div>

        {/* ===== PAYMENTS ADDED ===== */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Payments
              </span>
              <Badge variant="secondary" className="text-xs">
                {payments.length}
              </Badge>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {p.method}
                    </Badge>
                    <span className="font-mono text-sm font-medium">
                      {getCurrencySymbol(p.currencyCode)}{" "}
                      {formatPrice(p.amount)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePayment(p.id)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Icon name="X" className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== ADD PAYMENT SECTION ===== */}
        {!isFullyPaid && (
          <>
            <Separator />

            {/* Currency Toggle (only if multiple currencies) */}
            {activeCurrencies.length > 1 && (
              <div className="flex gap-2">
                {activeCurrencies.map((currency) => (
                  <Button
                    key={currency.currencyCode}
                    variant={
                      selectedCurrencyCode === currency.currencyCode
                        ? "default"
                        : "outline"
                    }
                    size="lg"
                    className="flex-1 text-lg font-bold"
                    onClick={() =>
                      setSelectedCurrencyCode(currency.currencyCode)
                    }
                  >
                    {currency.currency?.symbol || currency.currencyCode}
                  </Button>
                ))}
              </div>
            )}

            {/* Payment Method */}
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <Button
                  key={method.value}
                  variant={
                    selectedMethod === method.value ? "default" : "outline"
                  }
                  className="flex flex-col gap-0.5 h-auto py-2"
                  size="sm"
                  onClick={() => setSelectedMethod(method.value)}
                >
                  <Icon name={method.icon} className="w-4 h-4" />
                  <span className="text-xs">{method.label}</span>
                </Button>
              ))}
            </div>

            {/* Given Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Given
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={givenAmount}
                  onChange={(e) => setGivenAmount(e.target.value)}
                  placeholder={formatPrice(remainingInCurrency)}
                  className="pl-10 text-xl font-bold h-12"
                  autoFocus
                />
              </div>

              {/* Quick Amount Buttons (for cash) */}
              {selectedMethod === "CASH" && quickAmounts.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {quickAmounts.slice(0, 4).map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setGivenAmount(amount.toString())}
                      className="text-xs font-mono"
                    >
                      {currencySymbol}
                      {formatPrice(amount)}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Change Due (for cash, when overpaying) */}
            {selectedMethod === "CASH" && changeInCurrency > 0.01 && (
              <div className="flex items-center justify-between py-3 px-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <span className="text-sm font-medium">Change</span>
                <span className="text-xl font-bold text-green-600">
                  {currencySymbol}
                  {formatPrice(changeInCurrency)}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* Add (for partial/split) */}
              <Button
                variant="outline"
                onClick={handleAddPayment}
                disabled={givenValue <= 0}
                className="flex-1"
              >
                <Icon name="Plus" className="w-4 h-4" />
                Add
              </Button>

              {/* Pay Full */}
              <Button
                variant="secondary"
                onClick={handlePayFull}
                disabled={remainingInBase <= 0}
                className="flex-1"
              >
                <Icon name="Zap" className="w-4 h-4" />
                Full
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ===== FOOTER ACTIONS ===== */}
      <div className="flex pt-4 gap-2">
        <Button variant="outline" type="button" onClick={closeModal}>
          Cancel
        </Button>

        <Button
          onClick={handleConfirm}
          disabled={!isFullyPaid || payments.length === 0}
          className="flex-1 h-11 text-base"
        >
          <Icon name="Check" className="w-5 h-5" />
          {isFullyPaid ? "Complete" : "Add Payment"}
        </Button>
      </div>
    </div>
  );
};
