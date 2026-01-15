import { cn, Separator } from "@repo/ui";
import { formatPrice } from "./config";
import { useOrderStore } from "@/store/orderStore";

const Row = ({
  label,
  value,
  variant = "normal",
}: {
  label: string;
  value: React.ReactNode;
  variant?: "normal" | "discount" | "charge";
}) => {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium",
          variant === "discount" && "text-destructive"
        )}
      >
        {value}
      </span>
    </div>
  );
};

const OrderSummary = () => {
  const { getActiveOrder, getDiscountAmount, getOrderSubtotal } =
    useOrderStore();

  const order = getActiveOrder();

  const orderDiscount = getDiscountAmount();
  const subtotalAfterItemDiscounts = getOrderSubtotal();
  const shippingFee = order?.shippingFee || 0;

  const total = subtotalAfterItemDiscounts - orderDiscount + shippingFee;

  return (
    <div className="space-y-3">
      <Separator />

      <div className="space-y-1 px-2">
        <Row
          label="Subtotal"
          value={`$${formatPrice(subtotalAfterItemDiscounts)}`}
        />

        <Row
          label="Order Discount"
          value={`− $${formatPrice(orderDiscount)}`}
          variant="discount"
        />

        <Row
          label="Delivery Fee"
          value={`+ $${formatPrice(shippingFee)}`}
          variant="charge"
        />
      </div>

      <Separator />

      <div className="flex justify-between items-center px-2 py-1">
        <span className="text-sm font-semibold">Total Due</span>
        <span className="text-xl font-bold text-primary">
          ${formatPrice(total)}
        </span>
      </div>
    </div>
  );
};

export default OrderSummary;
