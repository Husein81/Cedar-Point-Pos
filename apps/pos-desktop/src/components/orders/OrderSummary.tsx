import { cn, Icon, Separator } from "@repo/ui";
import { formatPrice } from "./config";
import { useOrderStore } from "@/store/orderStore";
import { useKeypadStore } from "@/store/keypadStore";
import { OrderType } from "@repo/types";
import { VAT_RATE_PERCENT_LABEL } from "@/constants/finance";
import {
  useLoyaltyProgram,
  useCustomerLoyaltyAccount,
} from "@/hooks/useLoyalty";
import { Activity } from "react";

const Row = ({
  label,
  value,
  variant = "normal",
  onClick,
  active,
}: {
  label: string;
  value: React.ReactNode;
  variant?: "normal" | "discount" | "charge";
  onClick?: () => void;
  active?: boolean;
}) => {
  return (
    <div
      className={cn(
        "flex justify-between items-center text-xs",
        onClick && "cursor-pointer rounded px-1 -mx-1 hover:bg-accent/40",
        active && "bg-primary/10",
      )}
      onClick={onClick}
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium",
          variant === "discount" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
};

const OrderSummary = () => {
  const {
    getActiveOrder,
    getDiscountAmount,
    getOrderSubtotal,
    getVATAmount,
    setShippingFee,
  } = useOrderStore();
  const { closeKeypad, context, itemId } = useKeypadStore();

  const order = getActiveOrder();

  const orderDiscount = getDiscountAmount();
  const subtotalAfterItemDiscounts = getOrderSubtotal();
  const shippingFee = order?.shippingFee || 0;
  const vatAmount = getVATAmount();
  const isDelivery = order?.type === OrderType.DELIVERY;

  // Loyalty info
  const { data: loyaltyProgram } = useLoyaltyProgram();
  const { data: loyaltyAccount } = useCustomerLoyaltyAccount(
    order?.customerId ?? null,
  );
  const showLoyaltyHint =
    loyaltyProgram?.isEnabled &&
    !!order?.customerId &&
    !!loyaltyAccount &&
    loyaltyAccount.pointsBalance > 0;

  const subtotalAfterDiscountAndShipping =
    subtotalAfterItemDiscounts - orderDiscount + shippingFee;
  const total = subtotalAfterDiscountAndShipping + vatAmount;

  const handleShippingFeeClick = () => {
    closeKeypad();

    const openKeypad = useKeypadStore.getState().openKeypad;
    openKeypad({
      context: "SHIPPING",
      currentValue: shippingFee,
      onConfirm: (value) => {
        setShippingFee(value);
      },
    });
  };

  return (
    <div className="space-y-1">
      <Activity
        mode={
          orderDiscount > 0 || isDelivery || order?.includeVAT
            ? "visible"
            : "hidden"
        }
      >
        <Separator />
      </Activity>
      <div className="space-y-1 px-2">
        {orderDiscount > 0 && (
          <Row
            label="Order Discount"
            value={`− $${formatPrice(orderDiscount)}`}
            variant="discount"
            active={
              !itemId &&
              (context === "DISCOUNT" ||
                context === "DISCOUNT_PERCENT" ||
                context === "DISCOUNT_FIXED")
            }
          />
        )}

        {isDelivery && (
          <Row
            label="Delivery Fee"
            value={shippingFee > 0 ? `+ $${formatPrice(shippingFee)}` : "$0.00"}
            variant="charge"
            onClick={handleShippingFeeClick}
            active={context === "SHIPPING"}
          />
        )}

        {order?.includeVAT && (
          <Row
            label={`VAT (${VAT_RATE_PERCENT_LABEL})`}
            value={`+ $${formatPrice(vatAmount)}`}
            variant="charge"
          />
        )}
      </div>

      <Separator />

      {/* Loyalty points available */}
      {showLoyaltyHint && (
        <div className="flex items-center gap-1.5 px-2 py-1">
          <Icon name="Award" className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs text-purple-600 dark:text-purple-400">
            {loyaltyAccount.pointsBalance.toLocaleString()} pts available
          </span>
        </div>
      )}

      <div className="flex justify-between items-center px-2 ">
        <span className="text-sm font-semibold">Total Due</span>
        <span className="text-xl font-bold text-primary">
          ${formatPrice(total)}
        </span>
      </div>
    </div>
  );
};

export default OrderSummary;
