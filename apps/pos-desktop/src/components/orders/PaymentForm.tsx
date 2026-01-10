import { Button, Icon, Input, Separator, Shad } from "@repo/ui";
import { cn } from "@repo/ui";
import { useEffect, useMemo, useState } from "react";
import { PaymentMethod } from "@repo/types";
import { formatPrice, generateQuickCashAmounts } from "./config";
import { useModalStore } from "@/store/modalStore";

type Props = {
  total: number;
  onConfirm: (method: PaymentMethod, amountTendered: number) => void;
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

  // Reset when modal opens / total changes
  useEffect(() => {
    setSelectedMethod("CASH");
    setAmountTendered(total);
  }, [total]);

  const quickAmounts = useMemo(() => generateQuickCashAmounts(total), [total]);

  const changeDue =
    selectedMethod === "CASH" ? Math.max(0, amountTendered - total) : 0;

  const isValid = selectedMethod !== "CASH" || amountTendered >= total;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(selectedMethod, amountTendered);
    closeModal();
  };

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
          <p className="text-sm text-muted-foreground">Total Due</p>
          <p className="text-4xl font-bold text-primary">
            ${formatPrice(total)}
          </p>
        </div>

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
                Amount Tendered
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
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
                  onClick={() => setAmountTendered(total)}
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
                    ${formatPrice(amount)}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Change */}
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

      {/* Actions */}
      <div className="flex pt-4 gap-2">
        <Button variant="outline" type="button">
          Cancel
        </Button>

        <Button
          onClick={handleConfirm}
          disabled={!isValid}
          className="min-w-32"
        >
          <Icon name="Check" className="w-4 h-4" />
          {selectedMethod === "CASH"
            ? `Pay $${formatPrice(total)}`
            : "Process Payment"}
        </Button>
      </div>
    </div>
  );
};
