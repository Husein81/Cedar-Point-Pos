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
    <div className="sm:max-w-md flex flex-col gap-5">
      {/* TOTAL */}
      <div className="rounded-lg bg-muted/30 p-4 text-center">
        <p className="text-xs text-muted-foreground uppercase">Total Due</p>
        <p className="text-4xl font-bold text-primary">${formatPrice(total)}</p>
      </div>

      {/* PAYMENT METHOD */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          Method
        </p>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <Button
              key={method.value}
              variant={selectedMethod === method.value ? "default" : "outline"}
              className="h-14 flex flex-col gap-1"
              onClick={() => setSelectedMethod(method.value)}
            >
              <Icon name={method.icon} className="w-5 h-5" />
              <span className="text-xs">{method.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* CASH FLOW */}
      {selectedMethod === "CASH" && (
        <>
          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Cash Received
            </p>

            {/* AMOUNT INPUT */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                $
              </span>
              <Input
                type="number"
                min={0}
                value={amountTendered}
                onChange={(e) =>
                  setAmountTendered(Math.max(0, Number(e.target.value) || 0))
                }
                className="pl-7 h-14 text-2xl font-bold text-center"
                autoFocus
              />
            </div>

            {/* QUICK CASH */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="secondary"
                onClick={() => setAmountTendered(total)}
              >
                Exact
              </Button>

              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => setAmountTendered(amount)}
                >
                  ${formatPrice(amount)}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* CHANGE */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Change Due</span>
            <span
              className={cn(
                "text-3xl font-bold",
                changeDue > 0 ? "text-green-600" : "text-muted-foreground"
              )}
            >
              ${formatPrice(changeDue)}
            </span>
          </div>
        </>
      )}

      {/* ACTIONS */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={closeModal}>
          Cancel
        </Button>

        <Button className="flex-1" onClick={handleConfirm} disabled={!isValid}>
          <Icon name="Check" className="w-4 h-4 mr-1" />
          {selectedMethod === "CASH"
            ? `Pay $${formatPrice(total)}`
            : "Process Payment"}
        </Button>
      </div>
    </div>
  );
};
