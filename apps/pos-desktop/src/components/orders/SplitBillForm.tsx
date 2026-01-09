import { Button, Icon, Input, Separator, Shad } from "@repo/ui";
import { cn } from "@repo/ui";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formatPrice } from "./config";

type SplitMode = "EQUAL" | "CUSTOM";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (mode: SplitMode, splits: number[]) => void;
}

export const SplitBillForm = ({
  open,
  onOpenChange,
  total,
  onConfirm,
}: Props) => {
  const [mode, setMode] = useState<SplitMode>("EQUAL");
  const [splitCount, setSplitCount] = useState(2);
  const [customSplits, setCustomSplits] = useState<number[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode("EQUAL");
      setSplitCount(2);
      setCustomSplits([Math.floor(total / 2), Math.ceil(total / 2)]);
    }
  }, [open, total]);

  // Update custom splits when split count changes
  useEffect(() => {
    if (mode === "EQUAL") {
      const perPerson = Math.floor(total / splitCount);
      const remainder = total - perPerson * splitCount;
      const splits = Array(splitCount)
        .fill(perPerson)
        .map((val, idx) => (idx === 0 ? val + remainder : val));
      setCustomSplits(splits);
    }
  }, [mode, splitCount, total]);

  const equalSplitAmount = useMemo(
    () => Math.floor(total / splitCount),
    [total, splitCount]
  );

  const customTotal = useMemo(
    () => customSplits.reduce((sum, val) => sum + val, 0),
    [customSplits]
  );

  const isValid = useMemo(() => {
    if (mode === "EQUAL") return true;
    return customTotal === total;
  }, [mode, customTotal, total]);

  const handleCustomSplitChange = useCallback(
    (index: number, value: string) => {
      const numValue = parseFloat(value) || 0;
      setCustomSplits((prev) => {
        const updated = [...prev];
        updated[index] = numValue;
        return updated;
      });
    },
    []
  );

  const handleAddSplit = useCallback(() => {
    if (mode === "EQUAL") {
      setSplitCount((prev) => Math.min(prev + 1, 10));
    } else {
      setCustomSplits((prev) => [...prev, 0]);
    }
  }, [mode]);

  const handleRemoveSplit = useCallback(
    (index: number) => {
      if (mode === "EQUAL") {
        setSplitCount((prev) => Math.max(prev - 1, 2));
      } else if (customSplits.length > 2) {
        setCustomSplits((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [mode, customSplits.length]
  );

  const handleConfirm = useCallback(() => {
    if (!isValid) return;
    onConfirm(mode, customSplits);
    onOpenChange(false);
  }, [isValid, onConfirm, mode, customSplits, onOpenChange]);

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="sm:max-w-lg">
        <Shad.DialogHeader>
          <Shad.DialogTitle className="text-xl">Split Bill</Shad.DialogTitle>
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
                  <span className="text-sm text-muted-foreground">
                    Per Guest
                  </span>
                  <span className="text-xl font-bold">
                    ${formatPrice(equalSplitAmount)}
                  </span>
                </div>
                {total % splitCount !== 0 && (
                  <p className="text-xs text-muted-foreground pl-1">
                    * First guest pays $
                    {formatPrice(equalSplitAmount + (total % splitCount))}{" "}
                    (includes remainder)
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Custom Splits List */}
              <Shad.ScrollArea className="max-h-60 pr-2">
                <div className="space-y-2">
                  {customSplits.map((amount, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2.5 bg-muted/20 rounded-lg"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                        {index + 1}
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          $
                        </span>
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e) =>
                            handleCustomSplitChange(index, e.target.value)
                          }
                          className="pl-7 h-9 text-right font-semibold"
                          min={0}
                          step={1}
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
                    : "bg-destructive/5 border-destructive/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={isValid ? "Check" : "AlertCircle"}
                    className={cn(
                      "w-4 h-4",
                      isValid ? "text-green-600" : "text-destructive"
                    )}
                  />
                  <span className="text-sm font-medium">
                    {isValid ? "Valid split" : "Total mismatch"}
                  </span>
                </div>
                <span
                  className={cn(
                    "font-bold text-sm",
                    isValid ? "text-green-600" : "text-destructive"
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            className="flex-1"
          >
            <Icon name="Check" className="w-4 h-4" />
            Confirm Split
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
