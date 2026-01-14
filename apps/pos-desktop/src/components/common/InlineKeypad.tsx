import { useKeypadStore } from "@/store/keypadStore";
import { KEYPAD_CONFIG, type KeypadContext } from "./config";
import { Button, cn, Icon, Shad } from "@repo/ui";
import { useRef, useState, useEffect } from "react";
import { useModalStore } from "@/store/modalStore";
import { useNavigate } from "@tanstack/react-router";
import { useOrderStore } from "@/store/orderStore";
import { useCartStore } from "@/store/cartStore";
import {
  useCreateOrder,
  useProcessPayment,
  useUpdateOrderStatus,
} from "@/hooks/useOrder";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { BusinessType, OrderType, PaymentMethod } from "@repo/types";
import type { CreateOrderDto } from "@/apis/ordersApi";
import { PaymentForm } from "@/components/orders/PaymentForm";
import { OrderStatus } from "@repo/types";

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
    setOrderStatus,
    clearOrder,
    closeTab,
    activeTabId,
  } = useOrderStore();
  const { getOrderSubtotal } = useOrderStore();
  const order = getActiveOrder();
  const subtotalAfterItemDiscounts = getOrderSubtotal();
  const orderDiscount = getDiscountAmount();

  const shippingFee = order?.shippingFee || 0;
  const total = subtotalAfterItemDiscounts - orderDiscount + shippingFee;

  const { clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { branchId } = useBranchStore();

  const createOrderMutation = useCreateOrder();
  const processPaymentMutation = useProcessPayment();
  const updateOrderStatusMutation = useUpdateOrderStatus();

  const [stringValue, setStringValue] = useState("0");
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const config = KEYPAD_CONFIG[context];
  const effectiveMaxValue = maxValueOverride ?? config.maxValue;

  /* ---------------------------------------------
     Init / Context Reset
  --------------------------------------------- */

  useEffect(() => {
    const formatted =
      config.decimals > 0 && currentValue !== 0
        ? currentValue.toFixed(config.decimals)
        : String(currentValue || (config.allowZero ? 0 : config.minValue));

    setStringValue(formatted);
    setIsTyping(false);
  }, [
    currentValue,
    context,
    itemId,
    config.decimals,
    config.allowZero,
    config.minValue,
  ]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  /* ---------------------------------------------
     Helpers
  --------------------------------------------- */

  const parse = (v: string): number => {
    const cleaned = v.replace(/[^\d.-]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;
    return config.decimals === 0
      ? parseInt(cleaned, 10) || 0
      : parseFloat(cleaned) || 0;
  };

  const clamp = (n: number): number => {
    let value = Math.max(config.minValue, Math.min(effectiveMaxValue, n));
    if (config.decimals > 0) {
      const m = Math.pow(10, config.decimals);
      value = Math.round(value * m) / m;
    } else {
      value = Math.round(value);
    }
    return value;
  };

  const validate = () => {
    const value = parse(stringValue);
    if (value < config.minValue) return false;
    if (value > effectiveMaxValue) return false;
    if (!config.allowZero && value === 0) return false;
    return true;
  };

  /* ---------------------------------------------
     LIVE UPDATE CORE
  --------------------------------------------- */

  const emitLiveValue = async (value: number) => {
    if (config.requiresPermission && onPermissionRequired) {
      const allowed = await onPermissionRequired(context);
      if (!allowed) {
        return;
      }
    }

    if (context === "QUANTITY") {
      onConfirm?.(value);
    }

    if (context === "PRICE_OVERRIDE") {
      onPriceChange?.(value);
    }

    if (
      context === "DISCOUNT" ||
      context === "DISCOUNT_PERCENT" ||
      context === "DISCOUNT_FIXED"
    ) {
      const type =
        context === "DISCOUNT_FIXED"
          ? "FIXED"
          : context === "DISCOUNT_PERCENT"
            ? "PERCENTAGE"
            : discountType || "PERCENTAGE";

      onDiscountChange?.(value, type);
    }
  };

  useEffect(() => {
    if (!isTyping) return;
    if (!validate()) return;

    const value = clamp(parse(stringValue));
    emitLiveValue(value);
  }, [stringValue, context]);

  /* ---------------------------------------------
     Input Handlers (UNCHANGED UI)
  --------------------------------------------- */

  const handleDigit = (digit: number) => {
    setStringValue((prev) => {
      if (!isTyping) {
        setIsTyping(true);
        return String(digit);
      }
      if (prev === "0") return String(digit);
      return prev + digit;
    });
  };

  const handleBackspace = () => {
    setStringValue((prev) => {
      if (prev.length <= 1) {
        setIsTyping(false);
        return "0";
      }
      return prev.slice(0, -1);
    });
  };

  const handleDecimal = () => {
    if (config.decimals === 0) return;
    setStringValue((prev) => (prev.includes(".") ? prev : prev + "."));
    setIsTyping(true);
  };

  const handleNegate = () => {
    if (context !== "PRICE_OVERRIDE" && context !== "DISCOUNT") return;
    setStringValue((prev) =>
      prev.startsWith("-") ? prev.slice(1) : "-" + prev
    );
    setIsTyping(true);
  };

  const handleContextSwitch = (newContext: KeypadContext) => {
    if (newContext === context) return;
    setIsTyping(false);
    switchContext(newContext);
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
        iconName="RotateCw"
      >
        Refund
      </Button>
    );
  };

  const handlePaymentConfirm = async (
    method: PaymentMethod,
    _amountTendered: number
  ) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const order = getActiveOrder();

      clearOrder();
      clearCart();

      closeKeypad();
      if (activeTabId) closeTab(activeTabId);
      closeModal();

      if (!order || order.items.length === 0 || !branchId || !user?.tenantId) {
        throw new Error("Missing order or required data");
      }

      if (total <= 0) {
        throw new Error("Order total must be greater than 0");
      }

      const businessType = user.tenant?.businessType;

      const orderType =
        order.type ??
        (businessType === BusinessType.RETAIL
          ? OrderType.RETAIL
          : OrderType.DINE_IN);

      const discountAmount = getDiscountAmount();

      const items = order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        discount: item.discount,
        notes: item.notes,
      }));

      const createOrderDto: CreateOrderDto = {
        branchId,
        type: orderType,
        customerId: order.customerId || undefined,
        items,
        ...(discountAmount > 0 && { discount: discountAmount }),
      };

      const createdOrder =
        await createOrderMutation.mutateAsync(createOrderDto);

      const paidOrder = await processPaymentMutation.mutateAsync({
        id: createdOrder.id,
        amount: total,
        method,
      });

      if (
        orderType === OrderType.RETAIL &&
        paidOrder.status === OrderStatus.PAID
      ) {
        await updateOrderStatusMutation.mutateAsync({
          id: createdOrder.id,
          status: OrderStatus.COMPLETED,
        });
      }

      setOrderStatus(OrderStatus.COMPLETED);
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

  if (!isOpen) return null;

  return (
    <Shad.Collapsible
      open={isOpen}
      onOpenChange={(open) => !open && closeKeypad()}
    >
      <Shad.CollapsibleContent className="border-t border-border bg-background">
        {/* Header */}
        <div className="flex border-b border-border">
          <button className="flex-1 py-2.5 text-sm font-medium bg-primary/10 text-primary border-b-2 border-primary">
            Customer
          </button>
          <button className="flex-1 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted-foreground/50">
            Note
          </button>
          <button
            title="actions"
            className="px-3 py-2.5 text-muted-foreground hover:bg-muted-foreground/50"
            onClick={handleOpenModal}
          >
            <Icon name="EllipsisVertical" className="w-4 h-4" />
          </button>
        </div>

        {/* 🔢 ORIGINAL KEYPAD UI (UNCHANGED) */}
        <div className="grid grid-cols-4 gap-px bg-border p-px">
          {[1, 2, 3].map((n) => (
            <Button
              key={n}
              variant="ghost"
              className="h-12 text-lg font-medium rounded-none bg-background hover:bg-muted-foreground"
              onClick={() => handleDigit(n)}
            >
              {n}
            </Button>
          ))}
          <Button
            variant="ghost"
            className={cn(
              "h-12 text-sm font-semibold rounded-none",
              context === "QUANTITY"
                ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-500"
                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            )}
            onClick={() => handleContextSwitch("QUANTITY")}
          >
            Qty
          </Button>

          {[4, 5, 6].map((n) => (
            <Button
              key={n}
              variant="ghost"
              className="h-12 text-lg font-medium rounded-none bg-background hover:bg-muted-foreground"
              onClick={() => handleDigit(n)}
            >
              {n}
            </Button>
          ))}
          <Button
            variant="ghost"
            className={cn(
              "h-12 text-sm font-semibold rounded-none",
              context === "DISCOUNT"
                ? "bg-muted text-foreground"
                : "bg-background hover:bg-muted-foreground"
            )}
            onClick={() => handleContextSwitch("DISCOUNT")}
          >
            %
          </Button>

          {[7, 8, 9].map((n) => (
            <Button
              key={n}
              variant="ghost"
              className="h-12 text-lg font-medium rounded-none bg-background hover:bg-muted-foreground"
              onClick={() => handleDigit(n)}
            >
              {n}
            </Button>
          ))}
          <Button
            variant="ghost"
            className={cn(
              "h-12 text-sm font-semibold rounded-none",
              context === "PRICE_OVERRIDE"
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-red-100 text-red-800 hover:bg-red-200"
            )}
            onClick={() => handleContextSwitch("PRICE_OVERRIDE")}
          >
            Price
          </Button>

          <Button
            variant="ghost"
            className="h-12 text-lg font-medium rounded-none bg-muted/50 hover:bg-muted-foreground"
            onClick={handleNegate}
          >
            +/-
          </Button>
          <Button
            variant="ghost"
            className="h-12 text-lg font-medium rounded-none bg-background hover:bg-muted-foreground"
            onClick={() => handleDigit(0)}
          >
            0
          </Button>
          <Button
            variant="ghost"
            className="h-12 text-lg font-medium rounded-none bg-background hover:bg-muted-foreground"
            onClick={handleDecimal}
            disabled={config.decimals === 0}
          >
            .
          </Button>
          <Button
            variant="ghost"
            className="h-12 rounded-none bg-red-50 hover:bg-red-100"
            onClick={handleBackspace}
          >
            <Icon name="Delete" className="w-5 h-5 text-red-600" />
          </Button>
        </div>
        <Button
          className="w-full rounded-xs"
          disabled={!validate()}
          isSubmitting={isProcessing}
          onClick={handlePay}
        >
          Pay
        </Button>
      </Shad.CollapsibleContent>
    </Shad.Collapsible>
  );
};
