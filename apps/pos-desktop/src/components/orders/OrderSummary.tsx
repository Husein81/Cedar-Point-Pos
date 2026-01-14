import { Separator } from "@repo/ui";
import { formatPrice } from "./config";
import { useOrderStore } from "@/store/orderStore";

const OrderSummary = () => {
  const {
    getItemDiscountsTotal,
    getActiveOrder,
    getDiscountAmount,
    getOrderSubtotal,
  } = useOrderStore();
  const order = getActiveOrder();
  const items = order?.items || [];
  const subtotalAfterItemDiscounts = getOrderSubtotal();
  const orderDiscount = getDiscountAmount();

  const rawSubtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const itemDiscounts = getItemDiscountsTotal();
  const taxRate = 0.11; // 11% tax rate - should come from settings
  const taxes = (subtotalAfterItemDiscounts - orderDiscount) * taxRate;
  const shippingFee = order?.shippingFee || 0;
  const total =
    subtotalAfterItemDiscounts - orderDiscount + taxes + shippingFee;

  return (
    <div>
      <Separator />
      <div className="space-y-1 text-xs px-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">${formatPrice(rawSubtotal)}</span>
        </div>
        {itemDiscounts > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item Discounts</span>
            <span>- ${formatPrice(itemDiscounts)}</span>
          </div>
        )}
        {orderDiscount > 0 && (
          <div className="flex justify-between text-destructive">
            <span>Order Discount</span>
            <span>- ${formatPrice(orderDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax (11%)</span>
          <span>+ ${formatPrice(taxes)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span>+ ${formatPrice(shippingFee)}</span>
        </div>
      </div>

      {/* TOTAL */}
      <div className="flex justify-between items-center p-2">
        <span className="text-base font-semibold">Total Due</span>
        <span className="text-lg font-bold text-primary">
          ${formatPrice(total)}
        </span>
      </div>
    </div>
  );
};
export default OrderSummary;
