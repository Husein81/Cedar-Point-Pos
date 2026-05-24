import { useKeypadStore } from "@/store/keypadStore";
import { useOrderStore } from "@/store/orderStore";
import { Icon, Shad } from "@repo/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import OrderActions from "../OrderActions";
import { KEYPAD_CONFIG, type KeypadContext } from "../config";
import KeypadActions from "./KeypadActions";
import KeypadGrid from "./KeypadGrid";

type InputMode = "IDLE" | "REPLACE" | "APPEND";

type DiscountMode = "FIXED" | "PERCENTAGE";

export const InlineKeypad = () => {
  const {
    isOpen,
    context,
    currentValue,
    discountType,
    itemId,
    maxValueOverride,
    onConfirm,
    onPriceChange,
    onDiscountChange,
    onPermissionRequired,
    closeKeypad,
    switchContext,
  } = useKeypadStore(
    useShallow((s) => ({
      isOpen: s.isOpen,
      context: s.context,
      currentValue: s.currentValue,
      discountType: s.discountType,
      itemId: s.itemId,
      maxValueOverride: s.maxValueOverride,
      onConfirm: s.onConfirm,
      onPriceChange: s.onPriceChange,
      onDiscountChange: s.onDiscountChange,
      onPermissionRequired: s.onPermissionRequired,
      closeKeypad: s.closeKeypad,
      switchContext: s.switchContext,
    })),
  );

  const { setDiscount, setShippingFee, order } = useOrderStore(
    useShallow((s) => ({
      setDiscount: s.setDiscount,
      setShippingFee: s.setShippingFee,
      order: s.getActiveOrder(),
    })),
  );

  const safeContext = (context ?? "QUANTITY") as KeypadContext;
  const config = KEYPAD_CONFIG[safeContext!];
  const maxValue = maxValueOverride ?? config.maxValue;

  const [value, setValue] = useState("0");
  const [mode, setMode] = useState<InputMode>("IDLE");

  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffBaseValue, setDiffBaseValue] = useState<number | null>(null);

  const parse = useCallback(
    (v: string) =>
      config.decimals === 0 ? parseInt(v || "0", 10) : parseFloat(v || "0"),
    [config.decimals],
  );

  const clamp = useCallback(
    (n: number) => {
      let v = Math.max(config.minValue, Math.min(maxValue, n));

      if (config.decimals > 0) {
        const m = Math.pow(10, config.decimals);
        v = Math.round(v * m) / m;
      } else {
        v = Math.round(v);
      }

      return v;
    },
    [config.decimals, config.minValue, maxValue],
  );

  const clearEntry = useCallback(() => {
    setMode("IDLE");
    setValue(String(config.allowZero ? 0 : config.minValue));

    setIsDiffMode(false);
    setDiffBaseValue(null);

    switchContext(undefined);
  }, [config.allowZero, config.minValue, switchContext]);

  const resolveDiscountMode = useCallback(
    (ctx: KeypadContext): DiscountMode => {
      if (ctx === "DISCOUNT_FIXED") return "FIXED";
      if (ctx === "DISCOUNT_PERCENT") return "PERCENTAGE";

      // fallback when ctx === "DISCOUNT"
      return (discountType as DiscountMode) || "PERCENTAGE";
    },
    [discountType],
  );

  const applyKeypadValue = useCallback(
    async (numericValue: number) => {
      if (config.requiresPermission && onPermissionRequired) {
        const allowed = await onPermissionRequired(safeContext);
        if (!allowed) {
          clearEntry();
          return;
        }
      }

      if (safeContext === "QUANTITY") {
        onConfirm?.(numericValue);
        return;
      }

      if (safeContext === "PRICE_OVERRIDE") {
        const finalPrice =
          isDiffMode && diffBaseValue !== null
            ? clamp(diffBaseValue + numericValue)
            : numericValue;

        onPriceChange?.(finalPrice);
        return;
      }

      if (safeContext === "SHIPPING") {
        setShippingFee(numericValue);
        return;
      }

      if (
        safeContext === "DISCOUNT" ||
        safeContext === "DISCOUNT_FIXED" ||
        safeContext === "DISCOUNT_PERCENT"
      ) {
        const type = resolveDiscountMode(safeContext);

        if (itemId && onDiscountChange) {
          onDiscountChange(numericValue, type);
          return;
        }

        setDiscount({ value: numericValue, type });
      }
    },
    [
      clamp,
      clearEntry,
      config.requiresPermission,
      diffBaseValue,
      isDiffMode,
      itemId,
      onConfirm,
      onDiscountChange,
      onPermissionRequired,
      onPriceChange,
      resolveDiscountMode,
      safeContext,
      setDiscount,
      setShippingFee,
    ],
  );

  useEffect(() => {
    const formatted =
      config.decimals > 0 && currentValue !== 0
        ? currentValue.toFixed(config.decimals)
        : String(currentValue || (config.allowZero ? 0 : config.minValue));

    setValue(formatted);
    setMode("REPLACE");
  }, [
    config.allowZero,
    config.decimals,
    config.minValue,
    currentValue,
    safeContext,
    itemId,
  ]);

  useEffect(() => {
    setIsDiffMode(false);
    setDiffBaseValue(null);
  }, [safeContext, itemId]);

  useEffect(() => {
    if (mode !== "APPEND") return;

    let cancelled = false;

    const t = setTimeout(async () => {
      const numeric = clamp(parse(value));
      if (cancelled) return;

      try {
        await applyKeypadValue(numeric);
      } catch (e) {
        console.error("Keypad apply failed:", e);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [applyKeypadValue, clamp, mode, parse, value]);

  const isDiscountContext =
    safeContext === "DISCOUNT" ||
    safeContext === "DISCOUNT_PERCENT" ||
    safeContext === "DISCOUNT_FIXED";

  const contextLabel = useMemo(() => {
    const discountMode = isDiscountContext
      ? resolveDiscountMode(safeContext)
      : null;

    const isLineDiscount = Boolean(itemId);

    const config = {
      QUANTITY: {
        text: "Editing Quantity",
        icon: "Hash",
      },

      PRICE_OVERRIDE: {
        text: "Custom Price ($)",
        icon: "DollarSign",
      },

      DISCOUNT_PERCENT: {
        text: isLineDiscount ? "Line Discount (%)" : "Order Discount (%)",
        icon: "Percent",
      },

      DISCOUNT_FIXED: {
        text: isLineDiscount ? "Line Discount ($)" : "Order Discount ($)",
        icon: "DollarSign",
      },

      SHIPPING: {
        text: "Shipping Fee ($)",
        icon: "Truck",
      },
    } satisfies Record<keyof KeypadContext, { text: string; icon: string }>;

    if (discountMode === "PERCENTAGE") {
      return config.DISCOUNT_PERCENT;
    }

    if (discountMode === "FIXED") {
      return config.DISCOUNT_FIXED;
    }

    return config[safeContext as keyof typeof config] ?? null;
  }, [safeContext, isDiscountContext, resolveDiscountMode, itemId]);

  if (!isOpen) return null;

  return (
    <Shad.Collapsible
      open={isOpen && !!order && order?.items.length > 0}
      onOpenChange={(open) => !open && closeKeypad()}
    >
      <Shad.CollapsibleContent className="border-t border-border bg-background">
        {/* Header */}
        <OrderActions />

        {/* Context indicator */}
        {contextLabel && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 border-b border-border">
            <Icon
              name={contextLabel.icon}
              className="h-3.5 w-3.5 text-primary"
            />
            <span className="text-xs font-semibold text-primary">
              {contextLabel.text}
            </span>
            <span className="text-xs text-muted-foreground ml-auto tabular-nums">
              {value}
            </span>
          </div>
        )}

        <KeypadGrid
          onChange={setValue}
          mode={mode}
          onModeChange={setMode}
          onDiffBaseValue={setDiffBaseValue}
          onIsDiffModeChange={setIsDiffMode}
        />

        <KeypadActions />
      </Shad.CollapsibleContent>
    </Shad.Collapsible>
  );
};
