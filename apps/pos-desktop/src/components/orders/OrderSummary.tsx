import { VAT_RATE_PERCENT_LABEL } from "@/constants/finance";
import {
  useCustomerLoyaltyAccount,
  useLoyaltyProgram,
} from "@/hooks/useLoyalty";
import { useKeypadStore } from "@/store/keypadStore";
import { useOrderStore } from "@/store/orderStore";
import { OrderType } from "@repo/types";
import { cn, Icon } from "@repo/ui";
import { formatPrice } from "./config";

const Row = ({
  label,
  value,
  variant = "normal",
  onClick,
  active,
  editable,
}: {
  label: string;
  value: React.ReactNode;
  variant?: "normal" | "discount" | "charge" | "paid";
  onClick?: () => void;
  active?: boolean;
  editable?: boolean;
}) => {
  const content = (
    <>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {editable && (
          <Icon name="Pencil" className="h-2.5 w-2.5 opacity-50" />
        )}
      </span>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          variant === "discount" && "text-destructive",
          variant === "paid" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "-mx-1 flex w-[calc(100%+0.5rem)] items-center justify-between rounded px-1 py-0.5",
          "transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active && "bg-primary/10",
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between py-0.5">{content}</div>
  );
};

/** Totals breakdown — subtotal, adjustments, taxes, payments, and the amount due. */
const OrderSummary = () => {
  const {
    getActiveOrder,
    getDiscountAmount,
    getOrderSubtotal,
    getVATAmount,
    setDiscount,
    setShippingFee,
  } = useOrderStore();
  const { closeKeypad, context, itemId } = useKeypadStore();

  const order = getActiveOrder();

  const orderDiscount = getDiscountAmount();
  const subtotal = getOrderSubtotal();
  const shippingFee = order?.shippingFee || 0;
  const vatAmount = getVATAmount();
  const isDelivery = order?.type === OrderType.DELIVERY;
  const paidAmount = order?.paidAmount ?? 0;

  const { data: loyaltyProgram } = useLoyaltyProgram();
  const { data: loyaltyAccount } = useCustomerLoyaltyAccount(
    order?.customerId ?? null,
  );
  const showLoyaltyHint =
    loyaltyProgram?.isEnabled &&
    !!order?.customerId &&
    !!loyaltyAccount &&
    loyaltyAccount.pointsBalance > 0;

  const total = subtotal - orderDiscount + shippingFee + vatAmount;
  const balanceDue = Math.max(0, total - paidAmount);
  const hasPayments = paidAmount > 0;

  const isOrderDiscountActive =
    !itemId &&
    (context === "DISCOUNT" ||
      context === "DISCOUNT_PERCENT" ||
      context === "DISCOUNT_FIXED");

  const handleEditOrderDiscount = () => {
    const discountType = order?.discount?.type ?? "PERCENTAGE";
    const keypadContext =
      discountType === "PERCENTAGE" ? "DISCOUNT_PERCENT" : "DISCOUNT_FIXED";

    closeKeypad();
    useKeypadStore.getState().openKeypad({
      context: keypadContext,
      currentValue: order?.discount?.value ?? 0,
      discountType,
      onConfirm: () => {},
      onDiscountChange: (value, type) => setDiscount({ value, type }),
      maxValueOverride: discountType === "FIXED" ? subtotal : undefined,
    });
  };

  const handleShippingFeeClick = () => {
    closeKeypad();
    useKeypadStore.getState().openKeypad({
      context: "SHIPPING",
      currentValue: shippingFee,
      onConfirm: (value) => {
        setShippingFee(value);
      },
    });
  };

  const hasBreakdown =
    subtotal > 0 || orderDiscount > 0 || isDelivery || order?.includeVAT;

  return (
    <div className="border-t border-border bg-muted/20 px-3 pb-2 pt-1.5">
      {hasBreakdown && (
        <div className="space-y-px pb-1.5">
          <Row label="Subtotal" value={`$${formatPrice(subtotal)}`} />

          {orderDiscount > 0 && (
            <Row
              label="Order Discount"
              value={`− $${formatPrice(orderDiscount)}`}
              variant="discount"
              onClick={handleEditOrderDiscount}
              active={isOrderDiscountActive}
              editable
            />
          )}

          {isDelivery && (
            <Row
              label="Delivery Fee"
              value={
                shippingFee > 0 ? `+ $${formatPrice(shippingFee)}` : "$0.00"
              }
              variant="charge"
              onClick={handleShippingFeeClick}
              active={context === "SHIPPING"}
              editable
            />
          )}

          {order?.includeVAT && (
            <Row
              label={`VAT (${VAT_RATE_PERCENT_LABEL})`}
              value={`+ $${formatPrice(vatAmount)}`}
              variant="charge"
            />
          )}

          {hasPayments && (
            <Row
              label="Paid"
              value={`− $${formatPrice(paidAmount)}`}
              variant="paid"
            />
          )}
        </div>
      )}

      {showLoyaltyHint && (
        <div className="flex items-center gap-1.5 pb-1">
          <Icon name="Award" className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-xs text-purple-600 dark:text-purple-400">
            {loyaltyAccount.pointsBalance.toLocaleString()} pts available
          </span>
        </div>
      )}

      {/* Grand total */}
      <div className="flex items-baseline justify-between border-t border-border/60 pt-1.5">
        <span className="text-sm font-semibold">
          {hasPayments ? "Balance Due" : "Total"}
        </span>
        <span
          key={balanceDue}
          className="animate-in fade-in slide-in-from-bottom-1 text-2xl font-bold tabular-nums tracking-tight text-primary duration-200"
        >
          ${formatPrice(balanceDue)}
        </span>
      </div>
    </div>
  );
};

export default OrderSummary;
