import { cn, Separator } from "@repo/ui";
import { formatPrice } from "./config";
import { useOrderStore } from "@/store/orderStore";
import { useKeypadStore } from "@/store/keypadStore";
import { OrderType } from "@repo/types";

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
      <Separator />

      <div className="space-y-1 px-2">
        <Row
          label="Subtotal"
          value={`$${formatPrice(subtotalAfterItemDiscounts)}`}
        />

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
            label="VAT (11%)"
            value={`+ $${formatPrice(vatAmount)}`}
            variant="charge"
          />
        )}
      </div>

      <Separator />

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
