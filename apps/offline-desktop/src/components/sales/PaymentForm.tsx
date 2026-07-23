import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Icon, Input, Separator, cn } from "@repo/ui";
import { PaymentMethod } from "@/shared/enums";
import { formatPrice, generateQuickCashAmounts } from "./config";
import { useModalStore } from "@/store/modalStore";

export type PaymentEntry = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: PaymentMethod.CASH, label: "Cash", icon: "Banknote" },
  { value: PaymentMethod.CARD, label: "Card", icon: "CreditCard" },
  { value: PaymentMethod.OTHER, label: "Other", icon: "Wallet" },
];

type Props = {
  total: number;
  currencySymbol: string;
  onConfirm: (payments: PaymentEntry[]) => void;
};

export const PaymentForm = ({ total, currencySymbol, onConfirm }: Props) => {
  const { closeModal } = useModalStore();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    PaymentMethod.CASH,
  );
  const [givenAmount, setGivenAmount] = useState("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );

  const remaining = Math.max(0, total - totalPaid);
  const givenValue = parseFloat(givenAmount) || 0;
  const appliedAmount = Math.min(givenValue, remaining);
  const changeDue = Math.max(0, givenValue - remaining);
  const isFullyPaid = remaining < 0.01;

  const quickAmounts = useMemo(
    () => generateQuickCashAmounts(remaining),
    [remaining],
  );

  useEffect(() => {
    if (!isFullyPaid) {
      setGivenAmount(remaining.toFixed(2).replace(/\.00$/, ""));
    }
  }, [remaining, isFullyPaid]);

  const handleAddPayment = () => {
    if (givenValue <= 0 || isFullyPaid) return;
    setPayments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), method: selectedMethod, amount: appliedAmount },
    ]);
    setGivenAmount("");
  };

  const handlePayFull = () => {
    if (remaining <= 0) return;
    setPayments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), method: selectedMethod, amount: remaining },
    ]);
    setGivenAmount("");
  };

  const handleRemovePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const handleConfirm = () => {
    if (!isFullyPaid || payments.length === 0 || isConfirming) return;
    setIsConfirming(true);
    onConfirm(payments);
  };

  return (
    <div className="px-2">
      <div className="space-y-4 pt-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center py-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total
            </p>
            <p className="text-2xl font-bold">
              {currencySymbol}
              {formatPrice(total)}
            </p>
          </div>
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
                  {formatPrice(remaining)}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Payments list */}
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
                    <span className="font-mono text-sm font-medium">
                      {currencySymbol}
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

        {!isFullyPaid && (
          <>
            <Separator />

            {/* Payment method */}
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <Button
                  key={method.value}
                  variant={selectedMethod === method.value ? "default" : "outline"}
                  className="flex flex-col gap-0.5 h-auto py-2"
                  size="sm"
                  onClick={() => setSelectedMethod(method.value)}
                >
                  <Icon name={method.icon} className="w-4 h-4" />
                  <span className="text-xs">{method.label}</span>
                </Button>
              ))}
            </div>

            {/* Given amount */}
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
                  placeholder={formatPrice(remaining)}
                  className="pl-10 text-xl font-bold h-12"
                  autoFocus
                />
              </div>

              {selectedMethod === PaymentMethod.CASH && quickAmounts.length > 0 && (
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

            {selectedMethod === PaymentMethod.CASH && changeDue > 0.01 && (
              <div className="flex items-center justify-between py-3 px-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <span className="text-sm font-medium">Change</span>
                <span className="text-xl font-bold text-green-600">
                  {currencySymbol}
                  {formatPrice(changeDue)}
                </span>
              </div>
            )}

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
                disabled={remaining <= 0}
                className="flex-1"
              >
                <Icon name="Zap" className="w-4 h-4 mr-2" />
                Full
              </Button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex flex-col gap-2 pt-4 border-t mt-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={closeModal}
              disabled={isConfirming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isFullyPaid || payments.length === 0 || isConfirming}
              isSubmitting={isConfirming}
              className="flex-1 text-base"
            >
              <Icon
                name={isFullyPaid ? "Check" : "Plus"}
                className="w-5 h-5 mr-2"
              />
              {isFullyPaid ? "Complete Sale" : "Add Payment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
