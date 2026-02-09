import {
  PaymentForm,
  type PaymentEntry,
} from "@/components/orders/PaymentForm";
import type { CreateOrderDto } from "@/dto/order.dto";
import {
  useCreateOrder,
  useProcessPayment,
  useSendToKitchen,
  useUpdateOrderStatus,
} from "@/hooks/useOrder";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { useKeypadStore } from "@/store/keypadStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { BusinessType, OrderStatus, OrderType } from "@repo/types";
import { Button, cn, Icon, Shad } from "@repo/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AlertDialog from "../common/AlertDialog";
import { KEYPAD_CONFIG, type KeypadContext } from "./config";
import OrderActions from "./OrderActions";

type InputMode = "IDLE" | "REPLACE" | "APPEND";

type KeyPad = {
  label: string;
  icon?: string;
  context?: KeypadContext | "NULL";
  variant?: "destructive" | "outline" | "ghost";
  onClick: () => void;
};

type DiscountMode = "FIXED" | "PERCENTAGE";

export const InlineKeypad = () => {
  const { openModal, closeModal } = useModalStore();

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
  } = useKeypadStore();

  const {
    getActiveOrder,
    getDiscountAmount,
    setDiscount,
    setOrderStatus,
    setShippingFee,
    clearOrder,
    closeTab,
    activeTabId,
    getOrderSubtotal,
    getVATAmount,
    markItemsSentToKitchen,
    getUnsentItems,
  } = useOrderStore();

  const { user } = useAuthStore();
  const { branchId } = useBranchStore();

  const isRestaurant = user?.tenant?.businessType === BusinessType.RESTAURANT;

  const createOrder = useCreateOrder();
  const processPayment = useProcessPayment();
  const updateOrderStatus = useUpdateOrderStatus();
  const sendToKitchen = useSendToKitchen();

  const inputRef = useRef<HTMLInputElement>(null);
  const paymentLockRef = useRef(false);

  const safeContext = (context ?? "QUANTITY") as KeypadContext;
  const config = KEYPAD_CONFIG[safeContext!];
  const maxValue = maxValueOverride ?? config.maxValue;

  const order = getActiveOrder();
  const subtotal = getOrderSubtotal();
  const discount = getDiscountAmount();
  const shippingFee = order?.shippingFee ?? 0;
  const vat = getVATAmount();
  const total = subtotal - discount + shippingFee + vat;

  const deliveryNeedsCustomer =
    order?.type === OrderType.DELIVERY && !order?.customerId;

  const deliveryNeedsAddress =
    order?.type === OrderType.DELIVERY &&
    !!order?.customerId &&
    !order?.customerAddress;

  const [value, setValue] = useState("0");
  const [mode, setMode] = useState<InputMode>("IDLE");
  const [isProcessing, setIsProcessing] = useState(false);

  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffBaseValue, setDiffBaseValue] = useState<number | null>(null);

  /* ---------------------------------------------
     Helpers
  --------------------------------------------- */

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

  const validate = useCallback(() => {
    const n = parse(value);
    if (!config.allowZero && n === 0) return false;
    if (n < config.minValue) return false;
    if (n > maxValue) return false;
    if (safeContext === "DISCOUNT_PERCENT" && n > 100) return false;
    return true;
  }, [config.allowZero, config.minValue, maxValue, parse, safeContext, value]);

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
      // permission gate
      if (config.requiresPermission && onPermissionRequired) {
        const allowed = await onPermissionRequired(safeContext);
        if (!allowed) {
          clearEntry();
          return;
        }
      }

      // dispatch by context
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

        // item-level discount
        if (itemId && onDiscountChange) {
          onDiscountChange(numericValue, type);
          return;
        }

        // order-level discount
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

  const buildOrderDto = useCallback((): CreateOrderDto | null => {
    const active = getActiveOrder();
    if (!active || !branchId || !user?.tenantId) return null;

    // Determine order type
    let orderType: OrderType;
    if (user.tenant?.businessType === BusinessType.RESTAURANT) {
      // For restaurants, use the active order type or default to DINE_IN
      orderType = active.type || OrderType.DINE_IN;
    } else {
      // For retail, always use RETAIL type
      orderType = OrderType.RETAIL;
    }

    const dto: CreateOrderDto = {
      branchId,
      type: orderType,
      customerId: active.customerId || undefined,
      shippingFee: active.shippingFee,
      includeVAT: active.includeVAT,
      items: active.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.price,
        discount: i.discount,
        notes: i.notes,
        modifiers: i.modifiers?.map((m) => m.modifierId),
      })),
      ...(discount > 0 && { discount }),
    };

    return dto;
  }, [
    branchId,
    discount,
    getActiveOrder,
    user?.tenant?.businessType,
    user?.tenantId,
  ]);

  const withPaymentLock = useCallback(async (fn: () => Promise<void>) => {
    if (paymentLockRef.current) return;
    paymentLockRef.current = true;
    try {
      await fn();
    } finally {
      paymentLockRef.current = false;
    }
  }, []);

  /* ---------------------------------------------
     Init / Context Reset
  --------------------------------------------- */

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
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    setIsDiffMode(false);
    setDiffBaseValue(null);
  }, [safeContext, itemId]);

  /* ---------------------------------------------
     LIVE UPDATE (debounced)
  --------------------------------------------- */

  useEffect(() => {
    if (mode !== "APPEND") return;
    if (!validate()) return;

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
  }, [applyKeypadValue, clamp, mode, parse, validate, value]);

  /* ---------------------------------------------
     Input Handlers (UI behavior preserved)
  --------------------------------------------- */

  const handleDigit = useCallback(
    (digit: number) => {
      setValue((prev) => {
        const next =
          mode !== "APPEND"
            ? String(digit)
            : prev === "0"
              ? String(digit)
              : prev + digit;

        // decimals limit
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
    [config.decimals, mode],
  );

  const handleBackspace = useCallback(() => {
    setValue((prev) => {
      if (!prev.length) {
        setMode("IDLE");
        return String(config.allowZero ? 0 : config.minValue);
      }

      const next = prev.slice(0, -1);
      if (!next.length) {
        setMode("IDLE");
        return String(config.allowZero ? 0 : config.minValue);
      }

      setMode("APPEND");
      return next;
    });
  }, [config.allowZero, config.minValue]);

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

  const handleContextSwitch = useCallback(
    (next: KeypadContext) => {
      if (next === safeContext) {
        clearEntry();
        return;
      }
      setMode("REPLACE");
      switchContext(next);
    },
    [clearEntry, safeContext, switchContext],
  );

  const handleDifferent = useCallback(() => {
    if (safeContext !== "PRICE_OVERRIDE") return;

    const base = parse(String(currentValue || 0));
    setIsDiffMode(true);
    setDiffBaseValue(base);
    setMode("REPLACE");
    setValue("0");
  }, [currentValue, parse, safeContext]);

  /* ---------------------------------------------
     Payment + Confirm Flows
  --------------------------------------------- */

  const handlePaymentConfirm = useCallback(
    async (payments: PaymentEntry[]) => {
      await withPaymentLock(async () => {
        if (isProcessing || payments.length === 0) return;

        const active = getActiveOrder();
        if (active?.type === OrderType.DELIVERY && !active?.customerId) return;
        if (active?.type === OrderType.DELIVERY && !active?.customerAddress)
          return;

        setIsProcessing(true);

        try {
          if (!active || !branchId || !user?.tenantId || total <= 0) return;

          // Get the active tab ID before closing anything
          const tabToClose = activeTabId;

          // POS-style UX: close input early
          closeKeypad();
          closeModal();

          if (
            user.tenant?.businessType === BusinessType.RESTAURANT &&
            !active.type
          ) {
            throw new Error("Order type is required");
          }

          const dto = buildOrderDto();
          if (!dto) return;

          const created = await createOrder.mutateAsync(dto);

          const result = await processPayment.mutateAsync({
            id: created.id,
            payments: payments.map((p) => ({
              amount: p.amount,
              method: p.method,
              currencyCode: p.currencyCode,
              exchangeRate: p.exchangeRate,
            })),
          });

          if (!result) return;

          setOrderStatus(result.status);

          // Close the tab AFTER order is created and payment is processed
          if (tabToClose) closeTab(tabToClose);

          if (result.status === OrderStatus.COMPLETED) {
            clearOrder();
          }
        } catch (error) {
          console.error("Payment failed:", error);
        } finally {
          setIsProcessing(false);
        }
      });
    },
    [
      activeTabId,
      branchId,
      buildOrderDto,
      clearOrder,
      closeKeypad,
      closeModal,
      closeTab,
      createOrder,
      getActiveOrder,
      isProcessing,
      processPayment,
      setOrderStatus,
      total,
      user?.tenant?.businessType,
      user?.tenantId,
      withPaymentLock,
    ],
  );

  const handlePay = () => {
    openModal(
      "Payment Form",
      <PaymentForm total={total} onConfirm={handlePaymentConfirm} />,
    );
  };

  const handleConfirmWithoutPayment = useCallback(async () => {
    await withPaymentLock(async () => {
      if (isProcessing || !order?.items?.length || total <= 0) return;
      if (order?.type === OrderType.DELIVERY && !order?.customerId) return;
      if (order?.type === OrderType.DELIVERY && !order?.customerAddress) return;

      setIsProcessing(true);

      try {
        const active = getActiveOrder();
        if (!active || !branchId || !user?.tenantId) return;

        // POS UX: clear local order immediately
        clearOrder();
        closeKeypad();
        closeModal();
        if (activeTabId) closeTab(activeTabId);

        if (
          user.tenant?.businessType === BusinessType.RESTAURANT &&
          !active.type
        ) {
          throw new Error("Order type is required");
        }

        const dto = buildOrderDto();
        if (!dto) return;

        const created = await createOrder.mutateAsync(dto);

        // For restaurant orders, transition to PENDING
        await updateOrderStatus.mutateAsync({
          id: created.id,
          status: OrderStatus.PENDING,
        });

        setOrderStatus(OrderStatus.PENDING);
      } catch (error) {
        console.error("Order confirmation failed:", error);
      } finally {
        setIsProcessing(false);
      }
    });
  }, [
    activeTabId,
    branchId,
    buildOrderDto,
    clearOrder,
    closeKeypad,
    closeModal,
    closeTab,
    createOrder,
    getActiveOrder,
    isProcessing,
    order?.items?.length,
    setOrderStatus,
    total,
    updateOrderStatus,
    user?.tenant?.businessType,
    user?.tenantId,
    withPaymentLock,
  ]);

  /* ---------------------------------------------
     Send to Kitchen (restaurant only)
  --------------------------------------------- */

  const unsentItems = getUnsentItems();
  const hasUnsentItems = unsentItems.length > 0;

  const handleSendToKitchen = useCallback(async () => {
    if (isProcessing || !order?.items?.length || !hasUnsentItems) return;
    if (order?.type === OrderType.DELIVERY && !order?.customerId) return;
    if (order?.type === OrderType.DELIVERY && !order?.customerAddress) return;

    setIsProcessing(true);

    try {
      const active = getActiveOrder();
      if (!active || !branchId || !user?.tenantId) return;

      if (!active.type) {
        throw new Error("Order type is required");
      }

      const dto = buildOrderDto();
      if (!dto) return;

      const created = await createOrder.mutateAsync(dto);

      // Send to kitchen via API
      await sendToKitchen.mutateAsync(created.id);

      // Mark all items as sent locally
      markItemsSentToKitchen();

      setOrderStatus(OrderStatus.PENDING);
    } catch (error) {
      console.error("Send to kitchen failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    branchId,
    buildOrderDto,
    createOrder,
    getActiveOrder,
    hasUnsentItems,
    isProcessing,
    markItemsSentToKitchen,
    order?.customerId,
    order?.customerAddress,
    order?.items?.length,
    order?.type,
    sendToKitchen,
    setOrderStatus,
    user?.tenantId,
  ]);

  /* ---------------------------------------------
     Render
  --------------------------------------------- */

  const isDiscountContext =
    safeContext === "DISCOUNT" ||
    safeContext === "DISCOUNT_PERCENT" ||
    safeContext === "DISCOUNT_FIXED";

  const contextLabel = useMemo(() => {
    if (safeContext === "QUANTITY")
      return { text: "Editing Quantity", icon: "Hash" };
    if (safeContext === "PRICE_OVERRIDE")
      return { text: "Custom Price ($)", icon: "DollarSign" };
    if (
      safeContext === "DISCOUNT_PERCENT" ||
      (isDiscountContext && resolveDiscountMode(safeContext) === "PERCENTAGE")
    )
      return {
        text: itemId ? "Line Discount (%)" : "Order Discount (%)",
        icon: "Percent",
      };
    if (
      safeContext === "DISCOUNT_FIXED" ||
      (isDiscountContext && resolveDiscountMode(safeContext) === "FIXED")
    )
      return {
        text: itemId ? "Line Discount ($)" : "Order Discount ($)",
        icon: "DollarSign",
      };
    if (safeContext === "SHIPPING")
      return { text: "Shipping Fee ($)", icon: "Truck" };
    return null;
  }, [safeContext, isDiscountContext, resolveDiscountMode, itemId]);

  const openDiscountForItem = useCallback(
    (discountContext: KeypadContext) => {
      // Item must already be selected via keypad (itemId set)
      if (!itemId) return;

      const item = order?.items.find((i) => i.id === itemId);
      if (!item) return;

      closeModal();
      handleContextSwitch(discountContext as Exclude<KeypadContext, undefined>);
    },
    [itemId, order?.items, closeModal, handleContextSwitch],
  );

  const openDiscountForOrder = useCallback(
    (discountContext: "DISCOUNT_PERCENT" | "DISCOUNT_FIXED") => {
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
    },
    [order?.discount, closeModal, closeKeypad, setDiscount, subtotal],
  );

  const handleDiscountIntent = useCallback(() => {
    // If already in a discount context, toggle it off
    if (isDiscountContext) {
      clearEntry();
      return;
    }

    const hasSelectedItem = !!itemId;

    openModal(
      "Apply Discount",
      <div className="max-w-sm mx-auto grid grid-cols-2 gap-2">
        {/* Line Discounts */}
        <Button
          size="lg"
          variant="outline"
          className="h-14 flex-col gap-1"
          disabled={!hasSelectedItem}
          onClick={() => openDiscountForItem("DISCOUNT_PERCENT")}
        >
          <Icon name="Percent" className="w-5 h-5" />
          <span className="text-xs font-medium">% Line Discount</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 flex-col gap-1"
          disabled={!hasSelectedItem}
          onClick={() => openDiscountForItem("DISCOUNT_FIXED")}
        >
          <Icon name="DollarSign" className="w-5 h-5" />
          <span className="text-xs font-medium">$ Line Discount</span>
        </Button>

        {/* Total Discounts */}
        <Button
          size="lg"
          variant="outline"
          className="h-14 flex-col gap-1"
          onClick={() => openDiscountForOrder("DISCOUNT_PERCENT")}
        >
          <Icon name="Percent" className="w-5 h-5" />
          <span className="text-xs font-medium">% Total Discount</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 flex-col gap-1"
          onClick={() => openDiscountForOrder("DISCOUNT_FIXED")}
        >
          <Icon name="DollarSign" className="w-5 h-5" />
          <span className="text-xs font-medium">$ Total Discount</span>
        </Button>

        {!hasSelectedItem && (
          <p className="col-span-2 text-xs text-muted-foreground text-center mt-1">
            Select a cart item first to apply a line discount.
          </p>
        )}
      </div>,
      "Choose discount type and scope.",
    );
  }, [
    isDiscountContext,
    clearEntry,
    itemId,
    openModal,
    openDiscountForItem,
    openDiscountForOrder,
  ]);

  const handleDollarButton = useCallback(() => {
    if (!itemId) return; // $ requires a selected cart item
    handleContextSwitch("PRICE_OVERRIDE");
  }, [itemId, handleContextSwitch]);

  const dollarContext: KeypadContext | "NULL" = "PRICE_OVERRIDE";

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

  if (!isOpen) return null;

  return (
    <Shad.Collapsible
      open={isOpen}
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

        <div className="flex-1 grid grid-cols-4 gap-0.5 bg-border p-px">
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
                  "h-10 2xl:h-12 text-lg",
                  isActive &&
                    "bg-primary/15 text-primary ring-1 ring-primary/30",
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

        <div className="flex items-center border-t border-border p-2 gap-2">
          <Button
            size="lg"
            className="flex-1 h-12 text-sm font-semibold"
            disabled={
              !order?.items?.length ||
              total <= 0 ||
              isProcessing ||
              deliveryNeedsCustomer ||
              deliveryNeedsAddress
            }
            isSubmitting={isProcessing}
            onClick={handlePay}
          >
            <Icon name="CreditCard" className="w-5 h-5 mr-2" />
            Payment
          </Button>

          {isRestaurant ? (
            <Button
              size="lg"
              variant="outline"
              className="flex-1 h-12 text-sm font-semibold"
              disabled={
                !order?.items?.length ||
                !hasUnsentItems ||
                isProcessing ||
                deliveryNeedsCustomer ||
                deliveryNeedsAddress
              }
              isSubmitting={isProcessing}
              onClick={handleSendToKitchen}
            >
              <Icon name="ChefHat" className="w-5 h-5 mr-2" />
              Send to Kitchen
              {hasUnsentItems && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {unsentItems.length}
                </span>
              )}
            </Button>
          ) : (
            <AlertDialog
              title="Confirm Order Without Payment"
              description="Are you sure you want to confirm this order without processing a payment? This action cannot be undone."
              onConfirm={handleConfirmWithoutPayment}
              iconButton="Check"
              buttonVariant="outline"
              label="Confirm"
              size="lg"
              className="flex-1 h-12 text-sm font-semibold"
              disabled={
                !order?.items?.length ||
                total <= 0 ||
                isProcessing ||
                deliveryNeedsCustomer ||
                deliveryNeedsAddress
              }
            />
          )}
        </div>
      </Shad.CollapsibleContent>
    </Shad.Collapsible>
  );
};
