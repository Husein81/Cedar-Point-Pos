import { useKeypadStore } from "@/store/keypadStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import ApplyDiscount from "../ApplyDiscount";
import { ItemNoteForm } from "../ItemNoteForm";
import { KEYPAD_CONFIG, type KeypadContext } from "../config";
import KeypadDisplay, { type KeypadTab } from "./KeypadDisplay";
import KeypadGrid from "./KeypadGrid";

type InputMode = "IDLE" | "REPLACE" | "APPEND";

type DiscountMode = "FIXED" | "PERCENTAGE";

/**
 * Inline numeric editor for the selected line / order adjustment.
 * Values apply live (debounced) while typing; Enter/✓ applies and closes,
 * Escape closes. Supports the physical keyboard and numpad.
 */
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

  const { openModal, closeModal } = useModalStore();

  const { setDiscount, setShippingFee, updateItemNotes, order, subtotal } =
    useOrderStore(
      useShallow((s) => ({
        setDiscount: s.setDiscount,
        setShippingFee: s.setShippingFee,
        updateItemNotes: s.updateItemNotes,
        order: s.getActiveOrder(),
        subtotal: s.getOrderSubtotal(),
      })),
    );

  const safeContext = (context ?? "QUANTITY") as Exclude<
    KeypadContext,
    undefined
  >;
  const config = KEYPAD_CONFIG[safeContext];
  const maxValue = maxValueOverride ?? config.maxValue;

  const selectedItem = itemId
    ? order?.items.find((i) => i.id === itemId)
    : undefined;

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
          setMode("IDLE");
          setValue(String(config.allowZero ? 0 : config.minValue));
          setIsDiffMode(false);
          setDiffBaseValue(null);
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
      config.allowZero,
      config.minValue,
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

  // Sync display when the target value/context changes (item switch, context switch)
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

  // Live apply — debounced so rapid typing settles before hitting the store
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

  // ── Input handlers ────────────────────────────────────────────────────────

  const handleDigit = useCallback(
    (digit: number) => {
      setValue((prev) => {
        const next =
          mode !== "APPEND"
            ? String(digit)
            : prev === "0"
              ? String(digit)
              : prev + digit;

        if (
          config.decimals > 0 &&
          next.includes(".") &&
          next.split(".")[1]!.length > config.decimals
        ) {
          return prev;
        }

        setMode("APPEND");
        return next;
      });
    },
    [mode, config.decimals],
  );

  const handleDoubleZero = useCallback(() => {
    handleDigit(0);
    handleDigit(0);
  }, [handleDigit]);

  const handleDecimal = useCallback(() => {
    if (config.decimals === 0) return;

    setValue((prev) => {
      if (mode !== "APPEND") {
        setMode("APPEND");
        return "0.";
      }
      return prev.includes(".") ? prev : prev + ".";
    });
  }, [config.decimals, mode]);

  const handleBackspace = useCallback(() => {
    setValue((prev) => {
      const next = prev.slice(0, -1);
      if (!next.length) {
        setMode("IDLE");
        return String(config.allowZero ? 0 : config.minValue);
      }

      setMode("APPEND");
      return next;
    });
  }, [config.allowZero, config.minValue]);

  const handleClear = useCallback(() => {
    setMode("IDLE");
    setValue(String(config.allowZero ? 0 : config.minValue));
    setIsDiffMode(false);
    setDiffBaseValue(null);
  }, [config.allowZero, config.minValue]);

  /** Apply immediately (flushing any pending debounce) and close. */
  const handleConfirmAndClose = useCallback(() => {
    const numeric = clamp(parse(value));
    void applyKeypadValue(numeric);
    closeKeypad();
  }, [applyKeypadValue, clamp, closeKeypad, parse, value]);

  const handleDiff = useCallback(() => {
    if (safeContext !== "PRICE_OVERRIDE") return;

    const base = parseFloat(String(currentValue || 0));
    setIsDiffMode(true);
    setDiffBaseValue(base);
    setMode("REPLACE");
    setValue("0");
  }, [currentValue, safeContext]);

  // ── Context switching / intents ───────────────────────────────────────────

  const isDiscountContext =
    safeContext === "DISCOUNT" ||
    safeContext === "DISCOUNT_PERCENT" ||
    safeContext === "DISCOUNT_FIXED";

  const handleSwitchContext = useCallback(
    (next: Exclude<KeypadContext, undefined>) => {
      if (next === safeContext) return;
      setMode("REPLACE");
      switchContext(next);
    },
    [safeContext, switchContext],
  );

  const openDiscountForItem = useCallback(
    (discountContext: "DISCOUNT_PERCENT" | "DISCOUNT_FIXED") => {
      if (!itemId) return;
      closeModal();
      handleSwitchContext(discountContext);
    },
    [closeModal, handleSwitchContext, itemId],
  );

  const openDiscountForOrder = useCallback(
    (discountContext: "DISCOUNT_PERCENT" | "DISCOUNT_FIXED") => {
      const currentDiscount = order?.discount;
      const discountValue = currentDiscount?.value ?? 0;
      const discountTypeValue =
        discountContext === "DISCOUNT_PERCENT" ? "PERCENTAGE" : "FIXED";

      closeModal();
      closeKeypad();

      useKeypadStore.getState().openKeypad({
        context: discountContext,
        currentValue: discountValue,
        discountType: discountTypeValue,
        onConfirm: () => {},
        onDiscountChange: (value, type) => {
          setDiscount({ value, type });
        },
        maxValueOverride:
          discountContext === "DISCOUNT_FIXED" ? subtotal : undefined,
      });
    },
    [closeKeypad, closeModal, order?.discount, setDiscount, subtotal],
  );

  const handleDiscountIntent = useCallback(() => {
    openModal(
      "Apply Discount",
      <ApplyDiscount
        openDiscountForItem={openDiscountForItem}
        openDiscountForOrder={openDiscountForOrder}
      />,
      "Choose discount type and scope.",
    );
  }, [openDiscountForItem, openDiscountForOrder, openModal]);

  const handleNoteIntent = useCallback(() => {
    if (!itemId || !selectedItem) return;

    openModal(
      `Note — ${selectedItem.name}`,
      <ItemNoteForm
        initialNote={selectedItem.notes ?? ""}
        onSave={(note) => {
          updateItemNotes(itemId, note);
          closeModal();
        }}
      />,
    );
  }, [closeModal, itemId, openModal, selectedItem, updateItemNotes]);

  // ── Physical keyboard / numpad support ────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest('[role="dialog"], [role="alertdialog"]'))
      ) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(Number(e.key));
      } else if (e.key === "." || e.key === ",") {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Delete") {
        e.preventDefault();
        handleClear();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleConfirmAndClose();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeKeypad();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    closeKeypad,
    handleBackspace,
    handleClear,
    handleConfirmAndClose,
    handleDecimal,
    handleDigit,
    isOpen,
  ]);

  // ── Presentation ──────────────────────────────────────────────────────────

  const activeDiscountMode = isDiscountContext
    ? resolveDiscountMode(safeContext)
    : null;

  const title = useMemo(() => {
    if (selectedItem) return selectedItem.name;

    if (isDiscountContext) {
      return activeDiscountMode === "FIXED"
        ? "Order Discount ($)"
        : "Order Discount (%)";
    }

    return config.label;
  }, [activeDiscountMode, config.label, isDiscountContext, selectedItem]);

  const { prefix, suffix } = useMemo(() => {
    if (isDiscountContext) {
      return activeDiscountMode === "FIXED"
        ? { prefix: "$", suffix: undefined }
        : { prefix: undefined, suffix: "%" };
    }
    if (
      safeContext === "PRICE_OVERRIDE" ||
      safeContext === "SHIPPING" ||
      safeContext === "PAYMENT"
    ) {
      return { prefix: "$", suffix: undefined };
    }
    return { prefix: undefined, suffix: safeContext === "QUANTITY" ? "×" : undefined };
  }, [activeDiscountMode, isDiscountContext, safeContext]);

  const tabs = useMemo((): KeypadTab[] => {
    if (!itemId) return [];

    const list: KeypadTab[] = [
      {
        key: "qty",
        label: "Qty",
        icon: "Hash",
        active: safeContext === "QUANTITY",
        onClick: () => handleSwitchContext("QUANTITY"),
      },
    ];

    if (onPriceChange) {
      list.push({
        key: "price",
        label: "Price",
        icon: "DollarSign",
        active: safeContext === "PRICE_OVERRIDE",
        onClick: () => handleSwitchContext("PRICE_OVERRIDE"),
      });
    }

    if (onDiscountChange) {
      list.push({
        key: "discount",
        label: "Disc",
        icon: "TicketPercent",
        active: isDiscountContext,
        indicator: (selectedItem?.discount?.value ?? 0) > 0,
        onClick: handleDiscountIntent,
      });
    }

    list.push({
      key: "note",
      label: "Note",
      icon: "StickyNote",
      active: false,
      indicator: !!selectedItem?.notes,
      onClick: handleNoteIntent,
    });

    return list;
  }, [
    handleDiscountIntent,
    handleNoteIntent,
    handleSwitchContext,
    isDiscountContext,
    itemId,
    onDiscountChange,
    onPriceChange,
    safeContext,
    selectedItem?.discount?.value,
    selectedItem?.notes,
  ]);

  if (!isOpen || !order || order.items.length === 0) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 border-t border-border bg-background duration-200">
      <KeypadDisplay
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        diffBase={isDiffMode ? diffBaseValue : null}
        tabs={tabs}
        onClose={closeKeypad}
      />

      <KeypadGrid
        decimalsAllowed={config.decimals > 0}
        showDiff={safeContext === "PRICE_OVERRIDE"}
        isDiffActive={isDiffMode}
        onDigit={handleDigit}
        onDoubleZero={handleDoubleZero}
        onDecimal={handleDecimal}
        onBackspace={handleBackspace}
        onClear={handleClear}
        onConfirm={handleConfirmAndClose}
        onDiff={handleDiff}
      />
    </div>
  );
};
