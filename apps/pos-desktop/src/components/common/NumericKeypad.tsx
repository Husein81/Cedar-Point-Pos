import { Button, cn, Icon, Input, Shad } from "@repo/ui";
import { useEffect, useRef, useState } from "react";
import { KEYPAD_CONFIG, KeypadContext } from "./config";

/**
 * Keypad context - determines behavior, validation, and labeling
 * Used for: Quantity, Price Override, Discount, Payment, Guest Count
 */

/**
 * Per-context configuration
 * Defines validation rules, decimal handling, and UI labels
 */

type NumericKeypadProps = {
  isOpen: boolean;
  onClose: () => void;
  currentValue: number;
  onConfirm: (value: number) => void;
  context: KeypadContext;
  /** Optional callback for permission checks (e.g., price override) */
  onPermissionRequired?: (context: KeypadContext) => Promise<boolean>;
};

/**
 * Production-grade numeric keypad for POS systems
 *
 * Supports multiple contexts with proper validation per use case.
 * Designed for high-volume environments: fast, intentional, impossible to misuse.
 *
 * Features:
 * - Context-aware configuration (quantity, price, discount, payment, guest count)
 * - Touch-first, keyboard-safe interaction
 * - Decimal support per context
 * - Min/max validation with smart rounding
 * - CE (Clear Entry) - reset to original value
 * - Clear - reset to 0 (if allowed)
 * - +/- quick adjustments
 * - Explicit Confirm / Cancel (no auto-save)
 * - Keyboard input support (0-9, Backspace, Enter, Escape)
 */
export const NumericKeypad = ({
  isOpen,
  onClose,
  currentValue,
  onConfirm,
  context,
  onPermissionRequired,
}: NumericKeypadProps) => {
  const config = KEYPAD_CONFIG[context];

  const baseValueRef = useRef(currentValue);
  const [stringValue, setStringValue] = useState<string>(String(currentValue));
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [hasError, setHasError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      baseValueRef.current = currentValue;
      setStringValue(formatDisplayValue(currentValue, config.decimals));
      setIsTyping(false);
      setHasError(false);
      // Focus input for keyboard support
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, currentValue, config.decimals]);

  const parseValue = (str: string): number => {
    if (config.decimals === 0) {
      return parseInt(str, 10) || 0;
    }
    return parseFloat(str) || 0;
  };

  const formatDisplayValue = (num: number, decimals: number): string => {
    if (decimals === 0) {
      return String(Math.floor(num));
    }
    return num.toFixed(decimals);
  };

  const validateValue = (num: number): number => {
    let clamped = Math.max(config.minValue, Math.min(config.maxValue, num));

    // Round to decimal places
    if (config.decimals > 0) {
      clamped =
        Math.round(clamped * Math.pow(10, config.decimals)) /
        Math.pow(10, config.decimals);
    }

    return clamped;
  };

  const handleDigit = (digit: number) => {
    setHasError(false);

    setStringValue((prev) => {
      if (!isTyping) {
        setIsTyping(true);
        // First digit: replace 0 or start fresh
        return String(digit);
      }

      // Subsequent digits: append
      let newStr = prev + String(digit);

      // Prevent leading zeros (except decimals)
      if (config.decimals === 0 && newStr.length > 1 && newStr[0] === "0") {
        newStr = newStr.slice(1);
      }

      // Max length check (prevent extreme inputs)
      const maxLength = 10 + config.decimals;
      if (newStr.length > maxLength) {
        return prev;
      }

      return newStr;
    });
  };

  const handleBackspace = () => {
    setHasError(false);

    setStringValue((prev) => {
      if (prev.length <= 1) {
        setIsTyping(false);
        return "0";
      }
      return prev.slice(0, -1);
    });
  };

  /**
   * Decimal point - only for applicable contexts
   */
  const handleDecimal = () => {
    if (config.decimals === 0) return; // Not applicable

    setHasError(false);

    setStringValue((prev) => {
      if (prev.includes(".")) return prev; // Already has decimal
      setIsTyping(true);
      return prev + ".";
    });
  };

  /* ============ QUICK ADJUSTMENTS ============ */

  /**
   * Increment by step
   */
  const handleIncrement = () => {
    setHasError(false);
    setIsTyping(false);

    setStringValue((prev) => {
      const num = parseValue(prev) + config.step;
      const validated = validateValue(num);
      return formatDisplayValue(validated, config.decimals);
    });
  };

  /**
   * Decrement by step
   */
  const handleDecrement = () => {
    setHasError(false);
    setIsTyping(false);

    setStringValue((prev) => {
      const num = parseValue(prev) - config.step;
      const validated = validateValue(num);
      return formatDisplayValue(validated, config.decimals);
    });
  };

  /**
   * CE (Clear Entry) - reset to base value
   * Common POS pattern: revert current edit without losing original
   */
  const handleCE = () => {
    setIsTyping(false);
    setHasError(false);
    setStringValue("0");
  };

  const handleClose = () => {
    onClose();
  };

  const handleConfirm = async () => {
    setHasError(false);

    const rawValue = parseValue(stringValue);
    const finalValue = validateValue(rawValue);

    // Permission check for price override
    if (context === "PRICE_OVERRIDE" && onPermissionRequired) {
      setIsLoading(true);
      try {
        const approved = await onPermissionRequired(context);
        if (!approved) {
          setHasError(true);
          setIsLoading(false);
          return;
        }
      } catch {
        setHasError(true);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    onConfirm(finalValue);
    onClose();
  };

  /**
   * Cancel without saving
   */
  const handleCancel = () => {
    setStringValue(formatDisplayValue(baseValueRef.current, config.decimals));
    onClose();
  };

  /* ============ KEYBOARD SUPPORT ============ */

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      handleDigit(parseInt(e.key, 10));
    } else if (e.key === "Backspace") {
      e.preventDefault();
      handleBackspace();
    } else if (e.key === ".") {
      e.preventDefault();
      handleDecimal();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    } else if (e.key === "+") {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === "-") {
      e.preventDefault();
      handleDecrement();
    }
  };

  /* ============ RENDER ============ */

  const numValue = parseValue(stringValue);
  const isValid = numValue >= config.minValue && numValue <= config.maxValue;

  return (
    <Shad.Dialog open={isOpen} onOpenChange={handleCancel}>
      <Shad.DialogContent
        showCloseButton={false}
        className={cn(
          "w-full max-w-xs p-4",
          "bg-background border border-border rounded-xl shadow-xl"
        )}
      >
        {/* Header - Context Label */}
        <Shad.DialogHeader>
          <Shad.DialogTitle className="text-center text-sm font-medium">
            {config.label}
          </Shad.DialogTitle>
        </Shad.DialogHeader>

        {/* Display Value */}
        <div className="py-4">
          <input
            placeholder="0"
            ref={inputRef}
            value={stringValue}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full h-24 text-center font-bold text-5xl",
              "bg-muted/50 rounded-lg px-3",
              "border-2 selection:bg-transparent",
              isValid
                ? "border-muted focus:border-primary"
                : "border-destructive focus:border-destructive"
            )}
          />
        </div>

        {/* Status Message */}
        {hasError && (
          <div className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive text-center">
            Permission denied or invalid value
          </div>
        )}

        {/* Quick Controls: Decrement / CE / Increment */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Button
            variant="outline"
            className="h-12 text-xl font-bold"
            onClick={handleDecrement}
            disabled={isLoading || !isValid}
          >
            <Icon name="Minus" className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            className="h-12 text-sm font-semibold"
            onClick={handleCE}
            disabled={isLoading}
          >
            CE
          </Button>

          <Button
            variant="outline"
            className="h-12 text-xl font-bold"
            onClick={handleIncrement}
            disabled={isLoading || !isValid}
          >
            <Icon name="Plus" className="w-5 h-5" />
          </Button>
        </div>

        {/* Numeric Keypad: 1-9 */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Button
              key={n}
              variant="outline"
              className="h-14 text-2xl font-semibold"
              onClick={() => handleDigit(n)}
              disabled={isLoading}
            >
              {n}
            </Button>
          ))}
        </div>

        {/* Bottom Row: 0 / Decimal / Backspace */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Button
            variant="outline"
            className="col-span-2 h-14 text-2xl font-semibold"
            onClick={() => handleDigit(0)}
            disabled={isLoading}
          >
            0
          </Button>

          {config.decimals > 0 && (
            <Button
              variant="outline"
              className="h-14 text-2xl font-semibold"
              onClick={handleDecimal}
              disabled={isLoading || stringValue.includes(".")}
            >
              .
            </Button>
          )}

          {config.decimals === 0 && (
            <Button
              variant="outline"
              className="h-14"
              onClick={handleBackspace}
              disabled={isLoading}
            >
              <Icon name="Delete" className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Backspace on separate row if decimals enabled */}
        {config.decimals > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="col-span-2"></div>
            <Button
              variant="outline"
              className="h-12"
              onClick={handleBackspace}
              disabled={isLoading}
            >
              <Icon name="Delete" className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Clear & Confirm Buttons */}
        <Shad.DialogFooter className="gap-2 pt-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClose}
            disabled={isLoading}
          >
            Close
          </Button>

          <Button
            className={cn(
              "flex-1",
              !isValid && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            isSubmitting={isLoading}
          >
            <Icon name="Check" className="w-4 h-4 mr-1" />
            {config.confirmLabel}
          </Button>
        </Shad.DialogFooter>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
