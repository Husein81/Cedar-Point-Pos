import type { LoyaltyAccount, LoyaltyProgram } from "@/dto/loyalty.dto";
import { useActiveTenantCurrencies } from "@/hooks/useCurrency";
import { PaymentMethod } from "@repo/types";
import { Button, Icon, Input, Separator, cn } from "@repo/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPrice, generateQuickCashAmounts } from "../config";
import PaymentFooterActions from "./PaymentFooterActions";
import PaymentSummaryCard from "./PaymentSummaryCard";
import PaymentsList from "./PaymentsList";
import { PAYMENT_METHODS, estimateLoyaltyDiscount } from "./config";

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
  loyaltyProgram?: LoyaltyProgram;
  loyaltyAccount?: LoyaltyAccount;
  customerId?: string | null;
  eligibleBase?: number;
};

export const PaymentForm = ({
  total,
  onConfirm,
  loyaltyProgram,
  loyaltyAccount,
  customerId,
  eligibleBase = 0,
}: Props) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>("");
  const [givenAmount, setGivenAmount] = useState<string>("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  const [redeemPointsInput, setRedeemPointsInput] = useState<string>("");
  const redeemPointsValue = parseInt(redeemPointsInput, 10) || 0;

  const loyaltyEstimate = useMemo(
    () =>
      estimateLoyaltyDiscount(redeemPointsValue, loyaltyProgram, eligibleBase),
    [redeemPointsValue, loyaltyProgram, eligibleBase],
  );

  const payableTotal = Math.max(0, total - loyaltyEstimate.appliedDiscount);

  const { data: activeCurrencies = [] } = useActiveTenantCurrencies();

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

  const totalPaidInBase = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amountInBase, 0);
  }, [payments]);

  const remainingInBase = Math.max(0, payableTotal - totalPaidInBase);
  const remainingInCurrency = remainingInBase * exchangeRate;

  const givenValue = parseFloat(givenAmount) || 0;

  const appliedInCurrency = Math.min(givenValue, remainingInCurrency);
  const appliedInBase = appliedInCurrency / exchangeRate;

  const changeInCurrency = Math.max(0, givenValue - remainingInCurrency);

  const isFullyPaid = Math.abs(remainingInBase) < 0.01;

  const quickAmounts = useMemo(
    () => generateQuickCashAmounts(remainingInCurrency),
    [remainingInCurrency],
  );

  useEffect(() => {
    if (baseCurrency && !selectedCurrencyCode) {
      setSelectedCurrencyCode(baseCurrency.currencyCode);
    }
  }, [baseCurrency, selectedCurrencyCode]);

  useEffect(() => {
    setSelectedMethod("CASH");
    setPayments([]);
    setGivenAmount("");
    setRedeemPointsInput("");
  }, [total]);

  useEffect(() => {
    if (!isFullyPaid) {
      setGivenAmount(remainingInCurrency.toFixed(2).replace(/\.00$/, ""));
    }
  }, [selectedCurrencyCode]);

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

  return (
    <div className="sm:max-w-lg">
      <div className="space-y-4 pt-4">
        {/* ===== SUMMARY CARDS ===== */}
          <PaymentSummaryCard
            isFullyPaid={isFullyPaid}
            total={total}
            currencySymbol={currencySymbol}
            remainingInCurrency={remainingInCurrency}
          />

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
                        setRedeemPointsInput(
                          String(loyaltyAccount.pointsBalance),
                        )
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
                          Est.
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

          {/* ===== PAYMENTS List ===== */}
          <PaymentsList
            baseCurrency={baseCurrency!}
            payments={payments}
            getCurrencySymbol={getCurrencySymbol}
            handleRemovePayment={handleRemovePayment}
          />

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
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
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
                  <Icon name="Plus" className="w-4 h-4 mr-2" />
                  Add
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePayFull}
                  disabled={remainingInBase <= 0}
                  className="flex-1"
                >
                  <Icon name="Zap" className="w-4 h-4 mr-2" />
                  Full
                </Button>
              </div>
            </>
          )}

          {/* ===== FOOTER ACTIONS ===== */}
        <PaymentFooterActions
          isConfirming={isConfirming}
          isFullyPaid={isFullyPaid}
          payments={payments}
          handleConfirm={handleConfirm}
          handlePayAndSend={handlePayAndSend}
        />
      </div>
    </div>
  );
};
