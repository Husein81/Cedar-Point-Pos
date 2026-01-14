import { Button, cn, Icon } from "@repo/ui";
import { useRef, useState } from "react";
import { KEYPAD_CONFIG, KeypadContext } from "./config";

type NumericKeypadProps = {
  currentValue: number;
  discountType?: "PERCENTAGE" | "FIXED";
  context: KeypadContext;
  onConfirm: (value: number) => void;
  onClose: () => void; // Replaces modal close with generic close handler
  onPermissionRequired?: (context: KeypadContext) => Promise<boolean>;
  onDiscountTypeChange?: (type: "PERCENTAGE" | "FIXED") => void;
};

export const NumericKeypad = ({
  currentValue,
  context,
  discountType,
  onConfirm,
  onClose,
  onPermissionRequired,
  onDiscountTypeChange,
}: NumericKeypadProps) => {
  const config = KEYPAD_CONFIG[context];

  const [stringValue, setStringValue] = useState(String(currentValue));
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const parse = (v: string) =>
    config.decimals === 0 ? parseInt(v, 10) || 0 : parseFloat(v) || 0;

  const clamp = (n: number) => {
    let v = Math.max(config.minValue, Math.min(config.maxValue, n));
    if (config.decimals > 0) {
      const p = Math.pow(10, config.decimals);
      v = Math.round(v * p) / p;
    }
    return v;
  };

  const handleDigit = (d: number) => {
    setHasError(false);
    setStringValue((p) => {
      if (!isTyping) {
        setIsTyping(true);
        return String(d);
      }
      const next = p + d;
      return next.length > 12 ? p : next;
    });
  };

  const handleBackspace = () =>
    setStringValue((p) => (p.length <= 1 ? "0" : p.slice(0, -1)));

  const handleConfirm = async () => {
    const value = clamp(parse(stringValue));

    if (context === "PRICE_OVERRIDE" && onPermissionRequired) {
      setIsLoading(true);
      const ok = await onPermissionRequired(context).catch(() => false);
      setIsLoading(false);
      if (!ok) return setHasError(true);
    }

    onConfirm(value);
    onClose(); // Use generic close handler instead of closeModal
  };

  const isValid =
    parse(stringValue) >= config.minValue &&
    parse(stringValue) <= config.maxValue;

  return (
    <div className="w-full">
      {/* Display */}
      <input
        placeholder="0"
        ref={inputRef}
        value={stringValue}
        onKeyDown={(e) => {
          if (e.key >= "0" && e.key <= "9") handleDigit(+e.key);
          if (e.key === "Backspace") handleBackspace();
          if (e.key === "Enter") handleConfirm();
        }}
        className={cn(
          "w-full h-14 text-3xl font-bold text-center rounded-md border",
          "bg-muted/50",
          isValid ? "border-border" : "border-destructive"
        )}
      />

      {/* Discount Type */}
      {context === "DISCOUNT" && onDiscountTypeChange && (
        <div className="flex gap-1 mt-2">
          <Button
            size="sm"
            className="flex-1 h-7"
            variant={discountType === "PERCENTAGE" ? "default" : "outline"}
            onClick={() => onDiscountTypeChange("PERCENTAGE")}
            iconName="Percent"
          />
          <Button
            size="sm"
            className="flex-1 h-7"
            variant={discountType === "FIXED" ? "default" : "outline"}
            onClick={() => onDiscountTypeChange("FIXED")}
            iconName="DollarSign"
          />
        </div>
      )}

      {hasError && (
        <div className="mt-2 text-xs text-center text-destructive">
          Permission denied
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Button
            key={n}
            variant="outline"
            className="h-9 text-lg rounded-sm"
            onClick={() => handleDigit(n)}
          >
            {n}
          </Button>
        ))}

        <Button
          variant="outline"
          className="h-9 col-span-2 text-lg"
          onClick={() => handleDigit(0)}
        >
          0
        </Button>

        {config.decimals > 0 ? (
          <Button
            variant="outline"
            className="h-9 text-lg"
            onClick={() =>
              !stringValue.includes(".") && setStringValue((v) => v + ".")
            }
          >
            .
          </Button>
        ) : (
          <Button variant="outline" className="h-9" onClick={handleBackspace}>
            <Icon name="Delete" className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 mt-3">
        <Button
          variant="outline"
          className="flex-1 h-8 text-xs"
          onClick={onClose}
        >
          Close
        </Button>
        <Button
          className="flex-1 h-8 text-xs"
          disabled={!isValid || isLoading}
          onClick={handleConfirm}
        >
          <Icon name="Check" className="w-3 h-3 mr-1" />
          OK
        </Button>
      </div>
    </div>
  );
};
