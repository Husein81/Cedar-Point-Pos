import {
  PaymentForm,
  type PaymentEntry,
} from "@/components/orders/PaymentForm";
import type { CreateOrderDto } from "@/dto/order.dto";
import {
  useCustomerLoyaltyAccount,
  useLoyaltyProgram,
} from "@/hooks/useLoyalty";
import {
  useBatchAddItemsToOrder,
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
import { Button, Icon, Shad, cn } from "@repo/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import AlertDialog from "../common/AlertDialog";
import OrderActions from "./OrderActions";
import { KEYPAD_CONFIG, type KeypadContext } from "./config";

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
    updateOrderId,
  } = useOrderStore();

  const { user } = useAuthStore();
  const { branchId } = useBranchStore();

  const isRestaurant = user?.tenant?.businessType === BusinessType.RESTAURANT;

  const createOrder = useCreateOrder();
  const processPayment = useProcessPayment();
  const updateOrderStatus = useUpdateOrderStatus();
  const sendToKitchen = useSendToKitchen();
  const batchAddItemsToOrder = useBatchAddItemsToOrder();

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
  const paidAmount = order?.paidAmount ?? 0;
  const remainingTotal = Math.max(0, total - paidAmount);

  // Loyalty data
  const { data: loyaltyProgram } = useLoyaltyProgram();
  const { data: loyaltyAccount } = useCustomerLoyaltyAccount(
    order?.customerId ?? null,
  );

  const loyaltyEligibleBase = Math.max(0, subtotal - discount);

  const deliveryNeedsCustomer =
    order?.type === OrderType.DELIVERY && !order?.customerId;

  const deliveryNeedsAddress =
    order?.type === OrderType.DELIVERY &&
    !!order?.customerId &&
    !order?.customerAddress;

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

  const buildOrderDto = useCallback((): CreateOrderDto | null => {
    const active = getActiveOrder();
    if (!active || !branchId || !user?.tenantId) return null;

    let orderType: OrderType;
    if (user.tenant?.businessType === BusinessType.RESTAURANT) {
      orderType = active.type || OrderType.DINE_IN;
    } else {
      orderType = OrderType.RETAIL;
    }

    const dto: CreateOrderDto = {
      branchId,
      type: orderType,
      customerId: active.customerId || undefined,
      shippingFee: active.shippingFee,
      includeVAT: active.includeVAT,
      ...(orderType === OrderType.DINE_IN && active.tableId
        ? { tableId: active.tableId }
        : {}),
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

  const isLoadedOrder = useCallback((): boolean => {
    const active = getActiveOrder();
    if (!active) return false;
    return !active.id.startsWith("order-");
  }, [getActiveOrder]);

  const getOrCreateOrderId = useCallback(async (): Promise<string | null> => {
    const active = getActiveOrder();
    if (!active) return null;

    if (isLoadedOrder()) {
      return active.id;
    }

    const dto = buildOrderDto();
    if (!dto) return null;

    const created = await createOrder.mutateAsync(dto);

    updateOrderId(created.id);

    return created.id;
  }, [
    buildOrderDto,
    createOrder,
    getActiveOrder,
    isLoadedOrder,
    updateOrderId,
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

  const handleDigit = (digit: number) => {
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
  };

  const handleBackspace = () => {
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
  };

  const handleDecimal = () => {
    if (config.decimals === 0) return;

    setValue((prev) => {
      if (mode !== "APPEND") {
        setMode("APPEND");
        return "0.";
      }
      return prev.includes(".") ? prev : prev + ".";
    });
  };

  const handleContextSwitch = (next: KeypadContext) => {
    if (next === safeContext) {
      clearEntry();
      return;
    }
    setMode("REPLACE");
    switchContext(next);
  };

  const handleDifferent = () => {
    if (safeContext !== "PRICE_OVERRIDE") return;

    const base = parse(String(currentValue || 0));
    setIsDiffMode(true);
    setDiffBaseValue(base);
    setMode("REPLACE");
    setValue("0");
  };

  const handlePaymentConfirm = async (
    payments: PaymentEntry[],
    sendToKitchenFirst = false,
    loyalty?: { redeemPoints: number },
  ) => {
    await withPaymentLock(async () => {
      if (payments.length === 0) return;

      const active = getActiveOrder();
      if (!active || !branchId || !user?.tenantId || remainingTotal <= 0)
        return;
      if (active.type === OrderType.DELIVERY && !active.customerId) return;
      if (active.type === OrderType.DELIVERY && !active.customerAddress) return;

      const tabToClose = activeTabId;
      closeKeypad();
      closeModal();
      if (tabToClose) closeTab(tabToClose);
      clearOrder();

      (async () => {
        try {
          if (
            user.tenant?.businessType === BusinessType.RESTAURANT &&
            !active.type
          ) {
            throw new Error("Order type is required");
          }

          const wasLoadedOrder = isLoadedOrder();
          const orderId = await getOrCreateOrderId();
          if (!orderId) return;

          // Sync local items if needed
          if (wasLoadedOrder) {
            const unsyncedLocal = active.items
              .filter((i) => !i.sentToKitchen && i.id.startsWith("item-"))
              .map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                notes: item.notes,
                modifiers: item.modifiers?.map((m) => m.modifierId),
              }));

            if (unsyncedLocal.length > 0) {
              await batchAddItemsToOrder.mutateAsync({
                id: orderId,
                items: unsyncedLocal,
              });
            }
          }

          // Send to kitchen if requested
          if (sendToKitchenFirst) {
            const unsentItems = active.items.filter((i) => !i.sentToKitchen);
            if (unsentItems.length > 0) {
              await sendToKitchen.mutateAsync(orderId);
            }
          }

          const result = await processPayment.mutateAsync({
            id: orderId,
            payments: payments.map((p) => ({
              amount: p.amount,
              method: p.method,
              currencyCode: p.currencyCode,
              exchangeRate: p.exchangeRate,
            })),
            loyalty,
          });

          if (!result) return;
        } catch (error: any) {
          const raw =
            error.response?.data?.message || error.message || "Payment failed";
          console.error("Background payment failed:", error);
          toast.error(`Sync Error: ${raw}. Please check invoice history.`, {
            duration: 8000,
          });
        }
      })();
    });
  };

  const handlePay = () => {
    openModal(
      "Payment Form",
      <PaymentForm
        total={remainingTotal}
        onConfirm={handlePaymentConfirm}
        hasUnsentItems={hasUnsentItems}
        loyaltyProgram={loyaltyProgram}
        loyaltyAccount={loyaltyAccount}
        customerId={order?.customerId}
        eligibleBase={loyaltyEligibleBase}
      />,
    );
  };

  const handleConfirmWithoutPayment = async () => {
    await withPaymentLock(async () => {
      if (!order?.items?.length || total <= 0) return;
      if (order?.type === OrderType.DELIVERY && !order?.customerId) return;
      if (order?.type === OrderType.DELIVERY && !order?.customerAddress) return;

      const active = getActiveOrder();
      if (!active || !branchId || !user?.tenantId) return;

      // OPTIMISTIC START: Clear UI immediately
      clearOrder();
      closeKeypad();
      closeModal();
      if (activeTabId) closeTab(activeTabId);

      toast.success("Confirming order...");
      // OPTIMISTIC END

      // Background syncing
      (async () => {
        try {
          if (
            user.tenant?.businessType === BusinessType.RESTAURANT &&
            !active.type
          ) {
            throw new Error("Order type is required");
          }

          const orderId = await getOrCreateOrderId();
          if (!orderId) return;

          // Transition to PENDING/CONFIRMED
          await updateOrderStatus.mutateAsync({
            id: orderId,
            status: OrderStatus.PENDING,
          });

          toast.success("Order synchronized successfully");
        } catch (error: any) {
          const message =
            error.response?.data?.message ||
            error.message ||
            "Order confirmation failed";
          console.error("Background confirmation failed:", error);
          toast.error(`Sync Error: ${message}`, { duration: 8000 });
        }
      })();
    });
  };

  /* ---------------------------------------------
     Send to Kitchen (restaurant only)
  --------------------------------------------- */

  const unsentItems = getUnsentItems();
  const hasUnsentItems = unsentItems.length > 0;

  const handleSendToKitchen = async () => {
    if (!order?.items?.length) return;

    if (!hasUnsentItems) {
      toast.success("No new items to send");
      return;
    }

    if (order?.type === OrderType.DELIVERY && !order?.customerId) return;
    if (order?.type === OrderType.DELIVERY && !order?.customerAddress) return;

    const active = getActiveOrder();
    if (!active || !branchId || !user?.tenantId) return;

    const unsentCount = active.items.filter((i) => !i.sentToKitchen).length;
    const wasLoadedOrder = isLoadedOrder();

    // OPTIMISTIC UPDATE: Mark items as sent immediately in the UI
    markItemsSentToKitchen();
    toast.success(
      `Sending ${unsentCount} item${unsentCount !== 1 ? "s" : ""} to kitchen...`,
    );

    // Run API call in background
    (async () => {
      try {
        const orderId = await getOrCreateOrderId();
        if (!orderId) return;

        if (wasLoadedOrder) {
          const unsyncedLocal = active.items
            .filter((i) => !i.sentToKitchen && i.id.startsWith("item-"))
            .map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              notes: item.notes,
              modifiers: item.modifiers?.map((m) => m.modifierId),
            }));

          if (unsyncedLocal.length > 0) {
            await batchAddItemsToOrder.mutateAsync({
              id: orderId,
              items: unsyncedLocal,
            });
          }
        }

        const result = await sendToKitchen.mutateAsync(orderId);

        if (result?.status) {
          setOrderStatus(result.status as OrderStatus);
        } else {
          setOrderStatus(OrderStatus.PENDING);
        }

        toast.success(
          `Kitchen confirmed ${unsentCount} item${unsentCount !== 1 ? "s" : ""}`,
        );
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          error.message ||
          "Failed to sync kitchen order";
        console.error("Background kitchen sync failed:", error);
        toast.error(`Kitchen Error: ${message}. Items might not be sent!`, {
          duration: 5000,
        });
        // NOTE: In a full implementation, we would rollback the markItemsSentToKitchen() here
      }
    })();
  };

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
  };

  const handleDollarButton = () => {
    if (!itemId) return;
    handleContextSwitch("PRICE_OVERRIDE");
  };

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
                  "h-10 2xl:h-12 text-lg dark:hover:bg-primary",
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
              remainingTotal <= 0 ||
              deliveryNeedsCustomer ||
              deliveryNeedsAddress
            }
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
                deliveryNeedsCustomer ||
                deliveryNeedsAddress
              }
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
