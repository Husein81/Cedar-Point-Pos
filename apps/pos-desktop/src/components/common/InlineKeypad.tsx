import { useKeypadStore } from "@/store/keypadStore";
import { KEYPAD_CONFIG, type KeypadContext } from "./config";
import { Button, cn, Icon, Shad } from "@repo/ui";
import { useRef, useState, useEffect } from "react";
import { useModalStore } from "@/store/modalStore";
import { useNavigate } from "@tanstack/react-router";
import { useOrderStore } from "@/store/orderStore";
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
    clearOrder,
    closeTab,
    activeTabId,
    getOrderSubtotal,
  } = useOrderStore();

  const order = getActiveOrder();
  const subtotal = getOrderSubtotal();
  const discount = getDiscountAmount();
  const shippingFee = order?.shippingFee || 0;
  const total = subtotal - discount + shippingFee;

  const { user } = useAuthStore();
  const { branchId } = useBranchStore();

  const createOrder = useCreateOrder();
  const processPayment = useProcessPayment();
  const updateOrderStatus = useUpdateOrderStatus();

  const inputRef = useRef<HTMLInputElement>(null);
  const config = KEYPAD_CONFIG[context];
  const maxValue = maxValueOverride ?? config.maxValue;

  const [value, setValue] = useState("0");
  const [mode, setMode] = useState<InputMode>("IDLE");
  const [isProcessing, setIsProcessing] = useState(false);

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
      if (context === "PRICE_OVERRIDE") onPriceChange?.(numeric);
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

        onDiscountChange?.(numeric, type);
      }
    }, 120);

    return () => clearTimeout(timeout);
  }, [value, context, mode]);

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
      if (prev.length <= 1) {
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

  const handlePaymentConfirm = async (
    method: PaymentMethod,
    _amountTendered: number
  ) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const order = getActiveOrder();
      if (!order || !branchId || !user?.tenantId || total <= 0) return;

      clearOrder();
      closeKeypad();

      if (activeTabId) {
        closeTab(activeTabId);
      }

      closeModal();

      const orderType =
        order.shippingFee && order.shippingFee > 0
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

      const paid = await processPayment.mutateAsync({
        id: created.id,
        amount: total,
        method,
      });

      if (orderType === OrderType.RETAIL && paid.status === OrderStatus.PAID) {
        await updateOrderStatus.mutateAsync({
          id: created.id,
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
          <Button
            onClick={() => setDiscount({ value: 10, type: "PERCENTAGE" })}
            className="flex-1 rounded-xs py-2.5 text-sm bg-primary/20 font-medium text-muted-foreground hover:text-white hover:bg-primary"
          >
            Discount
          </Button>
          <Button
            variant={"ghost"}
            className="px-3 rounded-xs py-2.5 text-muted-foreground hover:bg-primary/50"
            onClick={handleOpenModal}
          >
            <Icon name="EllipsisVertical" className="w-4 h-4" />
          </Button>
        </div>

        {/* 🔢 ORIGINAL KEYPAD UI (UNCHANGED) */}
        <div className="grid grid-cols-4 gap-px bg-border p-px">
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
            Qty
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
          >
            %
          </Button>

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
          >
            Price
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "h-12 rounded-xs text-sm font-semibold flex items-center gap-1",
              context === "SHIPPING" ? "bg-primary text-white" : "bg-background"
            )}
            onClick={() => handleContextSwitch("SHIPPING")}
          >
            <Icon name="Truck" className="w-4 h-4" />
          </Button>

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
        <Button
          className="w-full rounded-xs"
          disabled={!validate()}
          isSubmitting={isProcessing}
          onClick={handlePay}
        >
          Payment
        </Button>
      </Shad.CollapsibleContent>
    </Shad.Collapsible>
  );
};
