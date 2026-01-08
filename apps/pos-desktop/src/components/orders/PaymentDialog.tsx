import { Button, Icon, Input, Separator, Shad } from "@repo/ui";
import { cn } from "@repo/ui";
import { useState, useEffect, useCallback, useMemo } from "react";
import { PaymentMethod } from "@repo/types";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (method: PaymentMethod, amountTendered: number) => void;
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-LB", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const generateQuickCashAmounts = (total: number) => {
  const results = new Set<number>();

  const roundedTo1 = Math.ceil(total);
  results.add(roundedTo1);
  results.add(Math.ceil(total / 5) * 5);
  results.add(Math.ceil(total / 10) * 10);
  results.add(Math.ceil(total / 20) * 20);
  results.add(Math.ceil(total / 50) * 50);
  results.add(Math.ceil(total / 100) * 100);

  return Array.from(results)
    .filter((v) => v > total)
    .sort((a, b) => a - b)
    .slice(0, 6);
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] =
  [
    { value: "CASH", label: "Cash", icon: "Banknote" },
    { value: "CREDIT_CARD", label: "Card", icon: "CreditCard" },
    { value: "MOBILE_PAYMENT", label: "Mobile", icon: "Smartphone" },
  ];

export const PaymentDialog = ({
  open,
  onOpenChange,
  total,
  onConfirm,
}: PaymentDialogProps) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
  const [amountTendered, setAmountTendered] = useState<string>("");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedMethod("CASH");
      setAmountTendered(total.toString());
    }
  }, [open, total]);

  const quickAmounts = useMemo(() => generateQuickCashAmounts(total), [total]);

  const numericAmount = useMemo(
    () => parseFloat(amountTendered) || 0,
    [amountTendered]
  );
  const changeDue = useMemo(
    () => Math.max(0, numericAmount - total),
    [numericAmount, total]
  );
  const isValid = useMemo(() => numericAmount >= total, [numericAmount, total]);

  const handleQuickAmount = useCallback((amount: number) => {
    setAmountTendered(amount.toString());
  }, []);

  const handleExactAmount = useCallback(() => {
    setAmountTendered(total.toString());
  }, [total]);

  const handleConfirm = useCallback(() => {
    if (!isValid) return;
    onConfirm(selectedMethod, numericAmount);
    onOpenChange(false);
  }, [isValid, onConfirm, selectedMethod, numericAmount, onOpenChange]);

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="sm:max-w-md">
        <Shad.DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Icon name="CreditCard" className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <Shad.DialogTitle>Complete Payment</Shad.DialogTitle>
            </div>
          </div>
        </Shad.DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Total Due */}
          <div className="text-center py-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Due</p>
            <p className="text-4xl font-bold text-primary">
              ${formatPrice(total)}
            </p>
          </div>

          {/* Payment Method Selection */}
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

          {/* Amount Tendered - only for cash */}
          {selectedMethod === "CASH" && (
            <>
              <Separator />

              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  Amount Tendered
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="pl-7 text-xl font-semibold h-12 text-center"
                    min={0}
                    autoFocus
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExactAmount}
                    className="text-xs"
                  >
                    Exact
                  </Button>
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAmount(amount)}
                      className="text-xs"
                    >
                      ${formatPrice(amount)}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Change Due */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Change Due</span>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    changeDue > 0 ? "text-green-600" : "text-muted-foreground"
                  )}
                >
                  ${formatPrice(changeDue)}
                </span>
              </div>
            </>
          )}
        </div>

        <Shad.DialogFooter className="pt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedMethod === "CASH" && !isValid}
            className="min-w-32"
          >
            <Icon name="Check" className="w-4 h-4" />
            {selectedMethod === "CASH"
              ? `Pay $${formatPrice(total)}`
              : "Process Payment"}
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
