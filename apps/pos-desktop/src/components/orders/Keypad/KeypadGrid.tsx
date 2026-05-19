import { useKeypadStore } from "@/store/keypadStore";
import { Button, Icon, cn } from "@repo/ui";
import { useMemo, useCallback } from "react";
import { KEYPAD_CONFIG, type KeypadContext } from "../config";
import ApplyDiscount from "../ApplyDiscount";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";

type InputMode = "IDLE" | "REPLACE" | "APPEND";

type KeyPad = {
  label: string;
  icon?: string;
  context?: KeypadContext | "NULL";
  variant?: "destructive" | "outline" | "ghost";
  onClick: () => void;
};

type Props = {
  mode: InputMode;
  onDiffBaseValue: (value: React.SetStateAction<number | null>) => void;
  onChange: (value: React.SetStateAction<string>) => void;
  onIsDiffModeChange: (value: React.SetStateAction<boolean>) => void;
  onModeChange: (val: React.SetStateAction<InputMode>) => void;
};

export default function KeypadGrid({
  mode,
  onIsDiffModeChange,
  onModeChange,
  onDiffBaseValue,
  onChange,
}: Props) {
  const { openModal, closeModal } = useModalStore();
  const { context, currentValue, itemId, switchContext, closeKeypad } =
    useKeypadStore();
  const { getActiveOrder, setDiscount, getOrderSubtotal } = useOrderStore();

  const order = getActiveOrder();
  const subtotal = getOrderSubtotal();

  const safeContext = (context ?? "QUANTITY") as KeypadContext;
  const config = KEYPAD_CONFIG[safeContext!];
  const dollarContext: KeypadContext | "NULL" = "PRICE_OVERRIDE";

  const clearEntry = useCallback(() => {
    onModeChange("IDLE");
    onChange(String(config.allowZero ? 0 : config.minValue));

    onIsDiffModeChange(false);
    onDiffBaseValue(null);

    switchContext(undefined);
  }, [config.allowZero, config.minValue, switchContext]);

  const handleContextSwitch = (next: KeypadContext) => {
    if (next === safeContext) {
      clearEntry();
      return;
    }
    onModeChange("REPLACE");
    switchContext(next);
  };

  const handleDigit = useCallback(
    (digit: number) => {
      onChange((prev) => {
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

        onModeChange("APPEND");
        return next;
      });
    },
    [mode, config.decimals],
  );

  const handleDecimal = () => {
    if (config.decimals === 0) return;

    onChange((prev) => {
      if (mode !== "APPEND") {
        onModeChange("APPEND");
        return "0.";
      }
      return prev.includes(".") ? prev : prev + ".";
    });
  };

  const handleBackspace = () => {
    onChange((prev) => {
      if (!prev.length) {
        onModeChange("IDLE");
        return String(config.allowZero ? 0 : config.minValue);
      }

      const next = prev.slice(0, -1);
      if (!next.length) {
        onModeChange("IDLE");
        return String(config.allowZero ? 0 : config.minValue);
      }

      onModeChange("APPEND");
      return next;
    });
  };

  const handleDifferent = () => {
    if (safeContext !== "PRICE_OVERRIDE") return;

    const base = parseFloat(String(currentValue || 0));
    onIsDiffModeChange(true);
    onDiffBaseValue(base);
    onModeChange("REPLACE");
    onChange("0");
  };

  const openDiscountForItem = (discountContext: KeypadContext) => {
    if (!itemId) return;

    const item = order?.items.find((i) => i.id === itemId);
    if (!item) return;

    closeModal();
    handleContextSwitch(discountContext as Exclude<KeypadContext, undefined>);
  };

  const openDiscountForOrder = (
    discountContext: "DISCOUNT_PERCENT" | "DISCOUNT_FIXED",
  ) => {
    const currentDiscount = order?.discount;
    const discountValue = currentDiscount?.value ?? 0;
    const discountTypeValue =
      discountContext === "DISCOUNT_PERCENT" ? "PERCENTAGE" : "FIXED";

    closeModal();
    closeKeypad();

    const openKp = useKeypadStore.getState().openKeypad;
    openKp({
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
  };

  const handleDiscountIntent = () => {
    if (isDiscountContext) {
      clearEntry();
      return;
    }

    openModal(
      "Apply Discount",
      <ApplyDiscount
        openDiscountForItem={openDiscountForItem}
        openDiscountForOrder={openDiscountForOrder}
      />,
      "Choose discount type and scope.",
    );
  };

  const handleDollarButton = () => {
    if (!itemId) return;
    handleContextSwitch("PRICE_OVERRIDE");
  };

  const keypad: KeyPad[] = useMemo(
    () => [
      { label: "1", context: "NULL", onClick: () => handleDigit(1) },
      { label: "2", context: "NULL", onClick: () => handleDigit(2) },
      { label: "3", context: "NULL", onClick: () => handleDigit(3) },
      {
        label: "QTY",
        context: "QUANTITY",
        onClick: () => handleContextSwitch("QUANTITY"),
      },

      { label: "4", context: "NULL", onClick: () => handleDigit(4) },
      { label: "5", context: "NULL", onClick: () => handleDigit(5) },
      { label: "6", context: "NULL", onClick: () => handleDigit(6) },
      {
        label: "Disc.",
        context: "DISCOUNT",
        onClick: handleDiscountIntent,
      },

      { label: "7", context: "NULL", onClick: () => handleDigit(7) },
      { label: "8", context: "NULL", onClick: () => handleDigit(8) },
      { label: "9", context: "NULL", onClick: () => handleDigit(9) },
      {
        label: "PRICE_OVERRIDE",
        context: dollarContext,
        icon: "DollarSign",
        onClick: handleDollarButton,
      },

      {
        label: "Diff",
        icon: "Diff",
        context: "NULL",
        onClick: () => handleDifferent(),
      },
      { label: "0", context: "NULL", onClick: () => handleDigit(0) },
      { label: ".", context: "NULL", onClick: handleDecimal },
      {
        label: "DEL",
        icon: "Delete",
        context: "NULL",
        variant: "destructive",
        onClick: handleBackspace,
      },
    ],
    [
      handleBackspace,
      handleContextSwitch,
      handleDecimal,
      handleDifferent,
      handleDigit,
      handleDiscountIntent,
      handleDollarButton,
      dollarContext,
    ],
  );

  const isDiscountContext =
    safeContext === "DISCOUNT" ||
    safeContext === "DISCOUNT_PERCENT" ||
    safeContext === "DISCOUNT_FIXED";

  return (
    <div className="flex-1 grid grid-cols-4 gap-0.5 p-px">
      {keypad.map((key) => {
        const isActive =
          key.context !== "NULL" &&
          (key.context === safeContext ||
            (key.context === "DISCOUNT" && isDiscountContext));

        return (
          <Button
            key={key.label}
            variant={key.variant ?? "outline"}
            onClick={key.onClick}
            className={cn(
              "h-10 2xl:h-12 rounded-sm text-lg dark:hover:bg-primary",
              isActive && "bg-primary/15 text-primary ring-1 ring-primary/30",
            )}
          >
            {key.icon ? (
              <Icon
                name={key.icon}
                className={cn(
                  "w-5 h-5 mb-1 text-muted-foreground hover:text-white",
                  key.variant === "destructive" && "text-white",
                  isActive && "text-primary",
                )}
              />
            ) : (
              <span className="text-lg font-medium">{key.label}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
