import { Button, Icon, Input, Separator, Shad } from "@repo/ui";
import { cn } from "@repo/ui";
import { useState, useEffect, useMemo } from "react";
import { formatPrice } from "./config";
import { useModalStore } from "@/store/modalStore";
import type { PaymentMethod } from "@repo/types";

type SplitMode = "EQUAL" | "CUSTOM";

type Split = {
  amount: number;
  method: PaymentMethod;
};

type Props = {
  total: number;
  onConfirm: (splits: Split[]) => void;
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] =
  [
    { value: "CASH", label: "Cash", icon: "Banknote" },
    { value: "CARD", label: "Card", icon: "CreditCard" },
    { value: "CREDIT", label: "Credit", icon: "Wallet" },
    { value: "ONLINE", label: "Online", icon: "Smartphone" },
  ];

export const SplitBillForm = ({ total, onConfirm }: Props) => {
  const { closeModal } = useModalStore();
  const [mode, setMode] = useState<SplitMode>("EQUAL");
  const [splitCount, setSplitCount] = useState(2);
  const [customSplits, setCustomSplits] = useState<Split[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    setMode("EQUAL");
    setSplitCount(2);
    const halfAmount = Math.floor((total / 2) * 100) / 100;
    const remainder = Math.round((total - halfAmount * 2) * 100) / 100;
    setCustomSplits([
      { amount: halfAmount + remainder, method: "CASH" },
      { amount: halfAmount, method: "CASH" },
    ]);
  }, [total]);

  // Update custom splits when split count changes in EQUAL mode
  useEffect(() => {
    if (mode === "EQUAL") {
      const perPerson = Math.floor((total / splitCount) * 100) / 100;
      const remainder =
        Math.round((total - perPerson * splitCount) * 100) / 100;
      const splits: Split[] = Array(splitCount)
        .fill(perPerson)
        .map((val, idx) => ({
          amount: idx === 0 ? val + remainder : val,
          method: customSplits[idx]?.method || "CASH",
        }));
      setCustomSplits(splits);
    }
  }, [mode, splitCount, total]);

  const equalSplitAmount = useMemo(
    () => Math.floor((total / splitCount) * 100) / 100,
    [total, splitCount],
  );

  const customTotal = useMemo(
    () => customSplits.reduce((sum, split) => sum + split.amount, 0),
    [customSplits],
  );

  const isValid = useMemo(() => {
    if (mode === "EQUAL") return true;
    return Math.abs(customTotal - total) < 0.01;
  }, [mode, customTotal, total]);

  const handleCustomSplitChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustomSplits((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { amount: numValue, method: updated[index]!.method };
      }
      return updated;
    });
  };

  const handlePaymentMethodChange = (index: number, method: PaymentMethod) => {
    setCustomSplits((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { amount: updated[index]!.amount, method };
      }
      return updated;
    });
  };

  const handleAddSplit = () => {
    if (mode === "EQUAL") {
      setSplitCount((prev) => Math.min(prev + 1, 10));
    } else {
      setCustomSplits((prev) => [...prev, { amount: 0, method: "CASH" }]);
    }
  };

  const handleRemoveSplit = (index: number) => {
    if (mode === "EQUAL") {
      setSplitCount((prev) => Math.max(prev - 1, 2));
    } else if (customSplits.length > 2) {
      setCustomSplits((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(customSplits);
    closeModal();
  };

  return (
    <div className="px-2">
      <Shad.DialogHeader>
        <Shad.DialogDescription>
          Divide payment between multiple guests
        </Shad.DialogDescription>
      </Shad.DialogHeader>

      <div className="space-y-6 pt-2">
        {/* Total Display - Prominent */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
          <span className="text-sm font-medium text-muted-foreground">
            Total Amount
          </span>
          <span className="text-2xl font-bold text-primary">
            ${formatPrice(total)}
          </span>
        </div>

        {/* Mode Toggle - Clean Tabs Style */}
        <div className="flex gap-2 p-1 bg-muted/30 rounded-lg">
          <Button
            variant={mode === "EQUAL" ? "default" : "ghost"}
            onClick={() => setMode("EQUAL")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all"
          >
            <Icon name="Equal" className="w-4 h-4" />
            Equal Split
          </Button>
          <Button
            variant={mode === "CUSTOM" ? "default" : "ghost"}
            onClick={() => setMode("CUSTOM")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all"
          >
            <Icon name="PenLine" className="w-4 h-4" />
            Custom Split
          </Button>
        </div>

        <Separator />
        {/* Split Content */}
        {mode === "EQUAL" ? (
          <div className="space-y-4">
            {/* Guest Count Control */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <span className="text-sm font-medium">Number of Guests</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemoveSplit(0)}
                  disabled={splitCount <= 2}
                >
                  <Icon name="Minus" className="w-3.5 h-3.5" />
                </Button>
                <span className="w-10 text-center font-bold text-lg">
                  {splitCount}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleAddSplit}
                  disabled={splitCount >= 10}
                >
                  <Icon name="Plus" className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Result Display */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Per Guest</span>
                <span className="text-xl font-bold">
                  ${formatPrice(equalSplitAmount)}
                </span>
              </div>
              {total % splitCount !== 0 && (
                <p className="text-xs text-muted-foreground pl-1">
                  * First guest pays $
                  {formatPrice(
                    Math.round(
                      (equalSplitAmount +
                        (total - equalSplitAmount * splitCount)) *
                        100,
                    ) / 100,
                  )}{" "}
                  (includes remainder)
                </p>
              )}
            </div>

            {/* Payment Methods for Each Guest */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Payment Methods
              </label>
              <Shad.ScrollArea className="max-h-75 pr-2">
                <div className="space-y-3">
                  {customSplits.map((split, index) => (
                    <div
                      key={index}
                      className="p-3 bg-muted/20 rounded-lg border space-y-2"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium">
                          ${formatPrice(split.amount)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {PAYMENT_METHODS.map((method) => (
                          <Button
                            key={method.value}
                            variant={
                              split.method === method.value
                                ? "default"
                                : "outline"
                            }
                            className="flex flex-col gap-1 h-auto py-2"
                            onClick={() =>
                              handlePaymentMethodChange(index, method.value)
                            }
                            size="sm"
                          >
                            <Icon name={method.icon} className="w-4 h-4" />
                            <span className="text-xs">{method.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Shad.ScrollArea>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Custom Splits List */}
            <Shad.ScrollArea className="max-h-100 pr-2">
              <div className="space-y-3">
                {customSplits.map((split, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted/20 rounded-lg border space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                        {index + 1}
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          $
                        </span>
                        <Input
                          type="number"
                          value={split.amount}
                          onChange={(e) =>
                            handleCustomSplitChange(index, e.target.value)
                          }
                          className="pl-7 h-9 text-right font-semibold"
                          min={0}
                          step={0.01}
                        />
                      </div>
                      {customSplits.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => handleRemoveSplit(index)}
                        >
                          <Icon name="Trash2" className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    {/* Payment Method Selection */}
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map((method) => (
                        <Button
                          key={method.value}
                          variant={
                            split.method === method.value
                              ? "default"
                              : "outline"
                          }
                          className="flex flex-col gap-1 h-auto py-2"
                          onClick={() =>
                            handlePaymentMethodChange(index, method.value)
                          }
                          size="sm"
                        >
                          <Icon name={method.icon} className="w-4 h-4" />
                          <span className="text-xs">{method.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Shad.ScrollArea>

            {/* Add Guest Button */}
            <Button
              variant="outline"
              onClick={handleAddSplit}
              className="w-full h-9"
              disabled={customSplits.length >= 10}
            >
              <Icon name="Plus" className="w-4 h-4" />
              Add Guest
            </Button>

            {/* Validation Status */}
            <div
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border-2",
                isValid
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-destructive/5 border-destructive/20",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  name={isValid ? "Check" : "CircleAlert"}
                  className={cn(
                    "w-4 h-4",
                    isValid ? "text-green-600" : "text-destructive",
                  )}
                />
                <span className="text-sm font-medium">
                  {isValid ? "Valid split" : "Total mismatch"}
                </span>
              </div>
              <span
                className={cn(
                  "font-bold text-sm",
                  isValid ? "text-green-600" : "text-destructive",
                )}
              >
                ${formatPrice(customTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <Shad.DialogFooter className="gap-2 pt-2">
        <Button variant="outline" onClick={closeModal} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!isValid} className="flex-1">
          <Icon name="Check" className="w-4 h-4" />
          Confirm Split
        </Button>
      </Shad.DialogFooter>
    </div>
  );
};
