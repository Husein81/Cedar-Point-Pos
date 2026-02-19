import { Button, Icon, Input, Separator, Shad, Badge } from "@repo/ui";
import { cn } from "@repo/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentMethod } from "@repo/types";
import { formatPrice, generateQuickCashAmounts } from "./config";
import { useModalStore } from "@/store/modalStore";
import { useActiveTenantCurrencies } from "@/hooks/useCurrency";
import type { LoyaltyProgram, LoyaltyAccount } from "@/dto/loyalty.dto";

// Payment entry for split payments
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
  onConfirm: (
    payments: PaymentEntry[],
    sendToKitchenFirst?: boolean,
    loyalty?: { redeemPoints: number },
  ) => void;
  hasUnsentItems?: boolean;
  /** Loyalty program config — undefined means not loaded or not available */
  loyaltyProgram?: LoyaltyProgram;
  /** Customer loyalty account — undefined when no customer or account not loaded */
  loyaltyAccount?: LoyaltyAccount;
  /** Whether a customer is attached to the order */
  customerId?: string | null;
  /** Eligible base for loyalty discount (subtotal - orderDiscount, excl. VAT/shipping) */
  eligibleBase?: number;
};

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: string;
}[] = [
  { value: "CASH", label: "Cash", icon: "Banknote" },
  { value: "CARD", label: "Card", icon: "CreditCard" },
  { value: "ONLINE", label: "Online", icon: "Smartphone" },
];

// ===== Loyalty estimate (client preview) =====

function estimateLoyaltyDiscount(
  redeemPoints: number,
  program: LoyaltyProgram | undefined,
  eligibleBase: number,
): { appliedDiscount: number; appliedPoints: number } {
  if (
    !program ||
    !program.isEnabled ||
    !program.redeemPointsStep ||
    !program.redeemCurrencyPerStep ||
    program.maxRedeemPercent == null ||
    redeemPoints <= 0
  ) {
    return { appliedDiscount: 0, appliedPoints: 0 };
  }

  if (redeemPoints < (program.minRedeemPoints || 0)) {
    return { appliedDiscount: 0, appliedPoints: 0 };
  }

  const blockCount = Math.floor(redeemPoints / program.redeemPointsStep);
  const requestedDiscount = blockCount * program.redeemCurrencyPerStep;
  const maxDiscountByPercent = (eligibleBase * program.maxRedeemPercent) / 100;
  const appliedDiscount =
    Math.floor(
      Math.min(requestedDiscount, maxDiscountByPercent, eligibleBase) * 100,
    ) / 100;
  const appliedPoints =
    Math.floor(appliedDiscount / program.redeemCurrencyPerStep) *
    program.redeemPointsStep;

  return { appliedDiscount, appliedPoints };
}

export const PaymentForm = ({
  total,
  onConfirm,
  hasUnsentItems = false,
  loyaltyProgram,
  loyaltyAccount,
  customerId,
  eligibleBase = 0,
}: Props) => {
  const { closeModal } = useModalStore();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>("");
  const [givenAmount, setGivenAmount] = useState<string>("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  // ===== LOYALTY STATE =====
  const [redeemPointsInput, setRedeemPointsInput] = useState<string>("");
  const redeemPointsValue = parseInt(redeemPointsInput, 10) || 0;

  const loyaltyEstimate = useMemo(
    () =>
      estimateLoyaltyDiscount(redeemPointsValue, loyaltyProgram, eligibleBase),
    [redeemPointsValue, loyaltyProgram, eligibleBase],
  );

  // Payable total adjusted by loyalty discount
  const payableTotal = Math.max(0, total - loyaltyEstimate.appliedDiscount);

  // Fetch active currencies for payment
  const { data: activeCurrencies = [], isLoading: isLoadingCurrencies } =
    useActiveTenantCurrencies();

  // ===== CURRENCY HELPERS =====

  const baseCurrency = useMemo(() => {
    return activeCurrencies.find((c) => c.isDefault) || activeCurrencies[0];
  }, [activeCurrencies]);

  const selectedCurrency = useMemo(() => {
    if (!selectedCurrencyCode) return baseCurrency;
    return activeCurrencies.find(
      (c) => c.currencyCode === selectedCurrencyCode,
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
    [activeCurrencies],
  );

  // ===== PAYMENT CALCULATIONS =====

  // Total paid so far (in base currency)
  const totalPaidInBase = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amountInBase, 0);
  }, [payments]);

  // Remaining to pay (in base currency) — uses loyalty-adjusted payable total
  const remainingInBase = Math.max(0, payableTotal - totalPaidInBase);

  // Remaining displayed in current currency
  const remainingInCurrency = remainingInBase * exchangeRate;

  // Parse given amount
  const givenValue = parseFloat(givenAmount) || 0;

  // How much applies (capped at remaining)
  const appliedInCurrency = Math.min(givenValue, remainingInCurrency);
  const appliedInBase = appliedInCurrency / exchangeRate;

  // Change in the currency entered
  const changeInCurrency = Math.max(0, givenValue - remainingInCurrency);

  // Is fully paid?
  const isFullyPaid = Math.abs(remainingInBase) < 0.01;

  // Quick amounts based on remaining
  const quickAmounts = useMemo(
    () => generateQuickCashAmounts(remainingInCurrency),
    [remainingInCurrency],
  );

  // ===== EFFECTS =====

  // Initialize currency when available
  useEffect(() => {
    if (baseCurrency && !selectedCurrencyCode) {
      setSelectedCurrencyCode(baseCurrency.currencyCode);
    }
  }, [baseCurrency, selectedCurrencyCode]);

  // Reset form when total changes
  useEffect(() => {
    setSelectedMethod("CASH");
    setPayments([]);
    setGivenAmount("");
    setRedeemPointsInput("");
  }, [total]);

  // Pre-fill when currency changes
  useEffect(() => {
    if (!isFullyPaid) {
      setGivenAmount(remainingInCurrency.toFixed(2).replace(/\.00$/, ""));
    }
  }, [selectedCurrencyCode]);

  // ===== HANDLERS =====

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
    setGivenAmount("");
  };

  const handleRemovePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

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

  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = () => {
    if (!isFullyPaid || payments.length === 0 || isConfirming) return;
    setIsConfirming(true);
    const loyalty =
      loyaltyEstimate.appliedPoints > 0
        ? { redeemPoints: loyaltyEstimate.appliedPoints }
        : undefined;
    onConfirm(payments, false, loyalty);
  };

  const handlePayAndSend = () => {
    if (!isFullyPaid || payments.length === 0 || isConfirming) return;
    setIsConfirming(true);
    const loyalty =
      loyaltyEstimate.appliedPoints > 0
        ? { redeemPoints: loyaltyEstimate.appliedPoints }
        : undefined;
    onConfirm(payments, true, loyalty);
  };

  // ===== LOADING STATE =====
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
              isFullyPaid ? "bg-green-500/10" : "bg-orange-500/10",
            )}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Remaining
            </p>
            <p
              className={cn(
                "text-2xl font-bold",
                isFullyPaid ? "text-green-600" : "text-orange-600",
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

        {/* ===== LOYALTY REDEMPTION ===== */}
        {loyaltyProgram?.isEnabled && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Icon
                name="Award"
                className="w-4 h-4 text-purple-600 dark:text-purple-400"
              />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Loyalty Points
              </span>
            </div>

            {!customerId ? (
              <p className="text-xs text-purple-600 dark:text-purple-400 italic">
                Select a customer to redeem loyalty points
              </p>
            ) : !loyaltyAccount || loyaltyAccount.pointsBalance <= 0 ? (
              <p className="text-xs text-purple-600 dark:text-purple-400">
                No points available for this customer
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-700 dark:text-purple-300">
                    Available
                  </span>
                  <span className="font-mono font-medium text-purple-800 dark:text-purple-200">
                    {loyaltyAccount.pointsBalance.toLocaleString()} pts
                  </span>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-purple-700 dark:text-purple-300">
                      Redeem Points
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={loyaltyAccount.pointsBalance}
                      step={loyaltyProgram.redeemPointsStep || 1}
                      value={redeemPointsInput}
                      onChange={(e) => setRedeemPointsInput(e.target.value)}
                      placeholder={`Min ${loyaltyProgram.minRedeemPoints || 0}`}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() =>
                      setRedeemPointsInput(String(loyaltyAccount.pointsBalance))
                    }
                  >
                    Max
                  </Button>
                  {redeemPointsValue > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 text-xs text-destructive"
                      onClick={() => setRedeemPointsInput("")}
                    >
                      <Icon name="X" className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {/* Validation messages */}
                {redeemPointsValue > 0 &&
                  redeemPointsValue > loyaltyAccount.pointsBalance && (
                    <p className="text-xs text-destructive">
                      Exceeds available balance
                    </p>
                  )}
                {redeemPointsValue > 0 &&
                  loyaltyProgram.minRedeemPoints > 0 &&
                  redeemPointsValue < loyaltyProgram.minRedeemPoints && (
                    <p className="text-xs text-destructive">
                      Minimum {loyaltyProgram.minRedeemPoints} points required
                    </p>
                  )}

                {/* Applied estimate */}
                {loyaltyEstimate.appliedDiscount > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                    <div className="flex items-center gap-1.5">
                      <Icon
                        name="Sparkles"
                        className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400"
                      />
                      <span className="text-xs font-medium text-purple-800 dark:text-purple-200">
                        Est. Discount
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                        − ${formatPrice(loyaltyEstimate.appliedDiscount)}
                      </span>
                      <p className="text-[10px] text-purple-500">
                        {loyaltyEstimate.appliedPoints} pts · preview
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant="outline" className="text-xs">
                      {p.method}
                    </Badge>
                    <div>
                      <span className="font-mono text-sm font-medium">
                        {getCurrencySymbol(p.currencyCode)}{" "}
                        {formatPrice(p.amount)}
                      </span>
                      {/* Show conversion if not in base currency */}
                      {p.currencyCode !== baseCurrency?.currencyCode && (
                        <p className="text-xs text-muted-foreground font-mono">
                          ≈ ${formatPrice(p.amountInBase)}
                        </p>
                      )}
                    </div>
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

            {/* Currency Toggle */}
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

              {/* Quick Amount Buttons */}
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

            {/* Change Due */}
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
              <Button
                variant="outline"
                onClick={handleAddPayment}
                disabled={givenValue <= 0}
                className="flex-1"
              >
                <Icon name="Plus" className="w-4 h-4" />
                Add
              </Button>
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
        <Button
          variant="outline"
          type="button"
          onClick={closeModal}
          disabled={isConfirming}
        >
          Cancel
        </Button>

        {hasUnsentItems ? (
          <>
            <Button
              variant="outline"
              onClick={handleConfirm}
              disabled={!isFullyPaid || payments.length === 0 || isConfirming}
              isSubmitting={isConfirming}
              className="flex-1 text-base"
            >
              <Icon name="CreditCard" className="w-5 h-5" />
              Pay Only
            </Button>
            <Button
              onClick={handlePayAndSend}
              disabled={!isFullyPaid || payments.length === 0 || isConfirming}
              isSubmitting={isConfirming}
              className="flex-1 text-base"
            >
              <Icon name="ChefHat" className="w-5 h-5" />
              Pay & Send
            </Button>
          </>
        ) : (
          <Button
            onClick={handleConfirm}
            disabled={!isFullyPaid || payments.length === 0 || isConfirming}
            isSubmitting={isConfirming}
            className="flex-1 text-base"
          >
            <Icon name="Check" className="w-5 h-5" />
            {isFullyPaid ? "Complete" : "Add Payment"}
          </Button>
        )}
      </div>
    </div>
  );
};
