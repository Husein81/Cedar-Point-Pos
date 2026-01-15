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
import { BusinessType, OrderType } from "@repo/types";
import type { CreateOrderDto } from "@/apis/ordersApi";
import {
  PaymentForm,
  type PaymentEntry,
} from "@/components/orders/PaymentForm";
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
  const config = KEYPAD_CONFIG[context || "QUANTITY"];
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

      let finalStatus: OrderStatus | null = null;

      for (const payment of payments) {
        const result = await processPayment.mutateAsync({
          id: created.id,
          amount: payment.amount,
          method: payment.method,
          currencyCode: payment.currencyCode,
          exchangeRate: payment.exchangeRate,
        });

        finalStatus = result.status;
      }

      if (!finalStatus) return;

      setOrderStatus(finalStatus);

      if (finalStatus === OrderStatus.COMPLETED) {
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
      const orderType =
        orderToSave.shippingFee && orderToSave.shippingFee > 0
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
        <div className="flex border-b border-border">
          <Button
            onClick={handleOpenOrderDiscount}
            className={cn(
              "flex-1 rounded-xs py-2.5 text-sm font-medium transition-colors",
              context === "DISCOUNT" && !itemId
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-primary/20 text-muted-foreground hover:text-white hover:bg-primary"
            )}
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
        <div className="grid grid-cols-4 gap-0.5 bg-border p-px">
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
            PRICE
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "h-12 rounded-xs bg-background text-sm font-semibold flex items-center gap-1",
              context === "SHIPPING" && "bg-accent/10 "
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xs"
            disabled={
              !order?.customerId ||
              !order?.items?.length ||
              total <= 0 ||
              isProcessing
            }
            isSubmitting={isProcessing}
            onClick={handleConfirmWithoutPayment}
          >
            <Icon name="Check" className="w-4 h-4 mr-2" />
            Confirm
          </Button>
          <Button
            className="flex-1 rounded-xs"
            disabled={!order?.items?.length || total <= 0 || isProcessing}
            isSubmitting={isProcessing}
            onClick={handlePay}
          >
            <Icon name="CreditCard" className="w-4 h-4 mr-2" />
            Payment
          </Button>
        </div>
      </Shad.CollapsibleContent>
    </Shad.Collapsible>
  );
};
