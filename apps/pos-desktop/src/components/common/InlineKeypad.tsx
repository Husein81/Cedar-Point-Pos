import {
  PaymentForm,
  type PaymentEntry,
} from "@/components/orders/PaymentForm";
import type { CreateOrderDto } from "@/dto/order.dto";
import {
  useCreateOrder,
  useProcessPayment,
  useUpdateOrderStatus,
} from "@/hooks/useOrder";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { useKeypadStore } from "@/store/keypadStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { BusinessType, OrderStatus, OrderType } from "@repo/types";
import { Button, cn, Icon, Shad } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import AlertDialog from "./AlertDialog";
import { KEYPAD_CONFIG, type KeypadContext } from "./config";

type InputMode = "IDLE" | "REPLACE" | "APPEND";

export const InlineKeypad = () => {
  const navigate = useNavigate();
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
    toggleVAT,
    clearOrder,
    closeTab,
    activeTabId,
    getOrderSubtotal,
    getVATAmount,
    setOrderType,
  } = useOrderStore();

  const order = getActiveOrder();
  const subtotal = getOrderSubtotal();
  const discount = getDiscountAmount();
  const shippingFee = order?.shippingFee ?? 0;
  const vat = getVATAmount();
  const total = subtotal - discount + shippingFee + vat;

  const { user } = useAuthStore();
  const { branchId } = useBranchStore();

  const createOrder = useCreateOrder();
  const processPayment = useProcessPayment();
  const updateOrderStatus = useUpdateOrderStatus();

  const inputRef = useRef<HTMLInputElement>(null);
  const config = KEYPAD_CONFIG[context || "QUANTITY"];
  const maxValue = maxValueOverride ?? config.maxValue;

  const [value, setValue] = useState("0");
  const [mode, setMode] = useState<InputMode>("IDLE");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffBaseValue, setDiffBaseValue] = useState<number | null>(null);
  const [isShippingActive, setIsShippingActive] = useState(false);
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
  }, [currentValue, context, itemId]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  /* ---------------------------------------------
     Helpers
  --------------------------------------------- */

  const parse = (v: string) =>
    config.decimals === 0 ? parseInt(v || "0", 10) : parseFloat(v || "0");

  const clamp = (n: number) => {
    let v = Math.max(config.minValue, Math.min(maxValue, n));
    if (config.decimals > 0) {
      const m = Math.pow(10, config.decimals);
      v = Math.round(v * m) / m;
    } else {
      v = Math.round(v);
    }
    return v;
  };

  const validate = () => {
    const n = parse(value);
    if (!config.allowZero && n === 0) return false;
    if (n < config.minValue) return false;
    if (n > maxValue) return false;
    if (context === "DISCOUNT_PERCENT" && n > 100) return false;
    return true;
  };

  const clearEntry = () => {
    setMode("IDLE");
    setValue(String(config.allowZero ? 0 : config.minValue));

    setIsDiffMode(false);
    setDiffBaseValue(null);
    switchContext(undefined);
  };

  /* ---------------------------------------------
     LIVE UPDATE CORE
  --------------------------------------------- */
  useEffect(() => {
    if (mode !== "APPEND") return;
    if (!validate()) return;

    const timeout = setTimeout(async () => {
      const numeric = clamp(parse(value));

      if (config.requiresPermission && onPermissionRequired) {
        const allowed = await onPermissionRequired(context);
        if (!allowed) {
          clearEntry();
          return;
        }
      }

      if (context === "QUANTITY") onConfirm?.(numeric);
      if (context === "PRICE_OVERRIDE") {
        const finalPrice =
          isDiffMode && diffBaseValue !== null
            ? clamp(diffBaseValue + numeric)
            : numeric;

        onPriceChange?.(finalPrice);
      }
      if (context === "SHIPPING") {
        setShippingFee(numeric);
      }
      if (
        context === "DISCOUNT" ||
        context === "DISCOUNT_FIXED" ||
        context === "DISCOUNT_PERCENT"
      ) {
        const type =
          context === "DISCOUNT_FIXED"
            ? "FIXED"
            : context === "DISCOUNT_PERCENT"
              ? "PERCENTAGE"
              : discountType || "PERCENTAGE";

        // For item discount (when itemId is present)
        if (itemId && onDiscountChange) {
          onDiscountChange(numeric, type);
        }
        // For order-level discount
        else if (!itemId) {
          setDiscount({
            value: numeric,
            type,
          });
        }
      }
    }, 120);

    return () => clearTimeout(timeout);
  }, [value, context, mode, itemId]);

  useEffect(() => {
    setIsDiffMode(false);
    setDiffBaseValue(null);
  }, [context, itemId]);
  /* ---------------------------------------------
     Input Handlers (UNCHANGED UI)
  --------------------------------------------- */

  const handleDigit = (digit: number) => {
    setValue((prev) => {
      if (mode !== "APPEND") {
        setMode("APPEND");
        return String(digit);
      }
      if (
        config.decimals > 0 &&
        prev.includes(".") &&
        prev.split(".")[1]!.length >= config.decimals
      ) {
        return prev;
      }

      return prev === "0" ? String(digit) : prev + digit;
    });
  };

  const handleBackspace = () => {
    setValue((prev) => {
      if (prev.length < 1) {
        setMode("IDLE");
        return String(config.allowZero ? 0 : config.minValue);
      }
      return prev.slice(0, -1);
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
    if (next === context) {
      clearEntry();
      return;
    }
    setMode("REPLACE");
    switchContext(next);
  };

  const handleDifferent = () => {
    if (context !== "PRICE_OVERRIDE") return;

    const base = parse(currentValue.toString());

    setIsDiffMode(true);
    setDiffBaseValue(base);
    setMode("REPLACE");
    setValue("0");
  };

  const handleOpenOrderDiscount = () => {
    const currentDiscount = order?.discount;
    const discountValue = currentDiscount?.value ?? 0;
    const discountTypeValue = currentDiscount?.type ?? "PERCENTAGE";

    // Close current keypad and open new one for order discount
    closeKeypad();

    // Use openKeypad to set up order-level discount context
    // Note: no itemId means it's order-level discount
    const openKeypad = useKeypadStore.getState().openKeypad;
    openKeypad({
      context: "DISCOUNT",
      currentValue: discountValue,
      discountType: discountTypeValue,
      onConfirm: () => {},
      onDiscountChange: (value, type) => {
        setDiscount({
          value,
          type,
        });
      },
      maxValueOverride: subtotal,
    });
  };

  const handleShippingToggle = () => {
    if (isShippingActive) {
      setShippingFee(0);
      setOrderType(undefined);
      setIsShippingActive(false);
    } else {
      // Set order type to DELIVERY
      setOrderType(OrderType.DELIVERY);
      setIsShippingActive(true);
      handleContextSwitch("SHIPPING");
    }
  };

  const handleOpenModal = () => {
    openModal(
      "Actions",
      <Button
        onClick={() => {
          navigate({ to: "/refunds" });
          closeModal();
        }}
        size="lg"
        className="flex-1 rounded-xs"
        iconName="RotateCw"
      >
        Refund
      </Button>
    );
  };

  const handlePaymentConfirm = async (payments: PaymentEntry[]) => {
    if (isProcessing || payments.length === 0) return;

    setIsProcessing(true);

    try {
      const order = getActiveOrder();
      if (!order || !branchId || !user?.tenantId || total <= 0) return;

      // POS-style UX: close input early
      closeKeypad();
      closeModal();

      if (activeTabId) {
        closeTab(activeTabId);
      }
      const orderType = isShippingActive
        ? OrderType.DELIVERY
        : (order.type ??
          (user.tenant?.businessType === BusinessType.RETAIL
            ? OrderType.RETAIL
            : OrderType.DINE_IN));

      const dto: CreateOrderDto = {
        branchId,
        type: orderType,
        customerId: order.customerId || undefined,
        shippingFee: order.shippingFee,
        includeVAT: order.includeVAT,
        items: order.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.price,
          discount: i.discount,
          notes: i.notes,
        })),
        ...(discount > 0 && { discount }),
      };

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

      if (result.status === OrderStatus.COMPLETED) {
        clearOrder();
      }
    } catch (error) {
      console.error("Payment failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePay = () => {
    openModal(
      "Payment Form",
      <PaymentForm total={total} onConfirm={handlePaymentConfirm} />
    );
  };

  const handleConfirmWithoutPayment = async () => {
    if (isProcessing || !order?.items?.length || total <= 0) return;

    setIsProcessing(true);

    try {
      const orderToSave = getActiveOrder();
      if (!orderToSave || !branchId || !user?.tenantId) return;
      clearOrder();
      closeKeypad();

      if (activeTabId) {
        closeTab(activeTabId);
      }

      closeModal();
      // Create order without payment
      const orderType = isShippingActive
        ? OrderType.DELIVERY
        : (orderToSave.type ??
          (user.tenant?.businessType === BusinessType.RETAIL
            ? OrderType.RETAIL
            : OrderType.DINE_IN));

      const dto: CreateOrderDto = {
        branchId,
        type: orderType,
        customerId: orderToSave.customerId || undefined,
        shippingFee: orderToSave.shippingFee,
        items: orderToSave.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.price,
          discount: i.discount,
          notes: i.notes,
        })),
        ...(discount > 0 && { discount }),
      };

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
  };

  if (!isOpen) return null;

  return (
    <Shad.Collapsible
      open={isOpen}
      onOpenChange={(open) => !open && closeKeypad()}
    >
      <Shad.CollapsibleContent className="border-t border-border bg-background">
        {/* Header */}
        <div className="flex items-center gap-1 border-b border-border bg-background px-1 py-1">
          {/* VAT Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-1 rounded-xs px-3 font-semibold",
              order?.includeVAT
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent/40"
            )}
            onClick={toggleVAT}
          >
            <Icon name="Receipt" className="h-4 w-4" />
            VAT 11%
          </Button>

          {/* Divider */}
          <div className="h-6 w-px bg-border mx-0.5" />

          {/* Shipping */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-1 rounded-xs px-3",
              isShippingActive
                ? "bg-accent/15 text-primary"
                : "text-muted-foreground hover:bg-accent/40"
            )}
            onClick={handleShippingToggle}
          >
            <Icon name="Truck" className="h-4 w-4" />
            Shipping
          </Button>

          {/* Order Discount */}
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "flex items-center gap-1 rounded-xs px-3",
              context === "DISCOUNT" && !itemId
                ? "bg-accent/15 text-primary"
                : "text-muted-foreground hover:bg-accent/40"
            )}
            onClick={handleOpenOrderDiscount}
          >
            <Icon name="Percent" className="h-4 w-4" />
            Discount
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* More Actions */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xs text-primary hover:bg-accent/50"
            onClick={handleOpenModal}
          >
            <Icon name="EllipsisVertical" className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 grid grid-cols-4 gap-1 bg-border p-px">
          {[1, 2, 3].map((n) => (
            <Button
              key={n}
              variant="ghost"
              className="h-12 rounded-xs bg-background text-lg"
              onClick={() => handleDigit(n)}
            >
              {n}
            </Button>
          ))}
          <Button
            variant="ghost"
            className={cn(
              "h-12 rounded-xs bg-background text-lg",
              context === "QUANTITY" && "bg-accent/10"
            )}
            onClick={() => handleContextSwitch("QUANTITY")}
          >
            QTY
          </Button>

          {[4, 5, 6].map((n) => (
            <Button
              key={n}
              variant="ghost"
              className="h-12 rounded-xs bg-background text-lg"
              onClick={() => handleDigit(n)}
            >
              {n}
            </Button>
          ))}
          <Button
            variant="ghost"
            className={cn(
              "h-12 rounded-xs bg-background text-lg",
              context === "DISCOUNT" && "bg-accent/10"
            )}
            onClick={() => handleContextSwitch("DISCOUNT")}
            iconName="Percent"
          />

          {[7, 8, 9].map((n) => (
            <Button
              key={n}
              variant="ghost"
              className="h-12 rounded-xs bg-background text-lg"
              onClick={() => handleDigit(n)}
            >
              {n}
            </Button>
          ))}
          <Button
            variant="ghost"
            className={cn(
              "h-12 rounded-xs bg-background text-lg",
              context === "PRICE_OVERRIDE" && "bg-accent/10"
            )}
            onClick={() => handleContextSwitch("PRICE_OVERRIDE")}
            iconName="DollarSign"
          />

          <Button
            variant="ghost"
            className={cn(
              "h-12 rounded-xs bg-background text-lg",
              context === "PRICE_OVERRIDE" && "bg-accent/10"
            )}
            onClick={() => handleDifferent()}
            iconName="Diff"
          />

          <Button
            variant="ghost"
            className="h-12 rounded-xs bg-background text-lg"
            onClick={() => handleDigit(0)}
          >
            0
          </Button>
          <Button
            variant="ghost"
            className="h-12 rounded-xs bg-background text-lg"
            onClick={handleDecimal}
            disabled={config.decimals === 0}
          >
            .
          </Button>
          <Button
            variant="destructive"
            className={"h-12 rounded-xs text-lg "}
            onClick={handleBackspace}
          >
            <Icon name="Delete" className="w-5 h-5 text-white" />
          </Button>
        </div>
        <div className="flex items-center border-t border-border">
          <Button
            className="rounded-xs flex-1"
            size={"default"}
            disabled={!order?.items?.length || total <= 0 || isProcessing}
            isSubmitting={isProcessing}
            onClick={handlePay}
          >
            <Icon name="CreditCard" className="w-4 h-4 mr-2" />
            Payment
          </Button>
          <AlertDialog
            title="Confirm Order Without Payment"
            description="Are you sure you want to confirm this order without processing a payment? This action cannot be undone."
            onConfirm={handleConfirmWithoutPayment}
            iconButton="Check"
            buttonVariant="outline"
            label="Confirm Payment"
            className="rounded-xs flex-1"
          />
        </div>
      </Shad.CollapsibleContent>
    </Shad.Collapsible>
  );
};
