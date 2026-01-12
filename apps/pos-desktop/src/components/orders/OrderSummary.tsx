import { useAuthStore } from "@/store/authStore";
import { useOrderStore } from "@/store/orderStore";
import { BusinessType, OrderType } from "@repo/types";
import { Button, cn, Select, Separator } from "@repo/ui";
import { useState } from "react";
import { NumericKeypad } from "../common/NumericKeypad";
import { formatPrice } from "./config";
import { OrderActions } from "./OrderActions";
import { KeypadContext } from "../common/config";

type OrderSummaryProps = {
  className?: string;
  onCompleteOrder?: () => void;
  onHoldOrder?: () => void;
  onConfirmWithoutPayment?: () => void;
};

export const OrderSummary = ({
  className,
  onCompleteOrder,
  onHoldOrder,
  onConfirmWithoutPayment,
}: OrderSummaryProps) => {
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [keypadType, setKeypadType] = useState<"DISCOUNT" | "SHIPPING">(
    "DISCOUNT"
  );
  const keypadContext: KeypadContext = keypadType;

  const {
    getActiveOrder,
    setDiscount,
    setShippingFee,
    getOrderSubtotal,
    getDiscountAmount,
    setOrderType,
  } = useOrderStore();
  const { user } = useAuthStore();

  const order = getActiveOrder();

  const discountValue = order?.discount?.value || 0;
  const discountType = order?.discount?.type || "PERCENTAGE";
  const shippingFee = order?.shippingFee || 0;

  // Get available order types based on business type
  type Option = { label: string; value: string };
  const getOrderTypeOptions = (): Option[] => {
    if (user?.tenant?.businessType === BusinessType.RETAIL) {
      return [
        { label: "Retail", value: OrderType.RETAIL.toString() },
        { label: "Delivery", value: OrderType.DELIVERY.toString() },
      ];
    }
    // Restaurant
    return [
      { label: "Dine In", value: OrderType.DINE_IN.toString() },
      { label: "Takeaway", value: OrderType.TAKEAWAY.toString() },
      { label: "Delivery", value: OrderType.DELIVERY.toString() },
    ];
  };

  const orderTypeOptions = getOrderTypeOptions();

  const discount = getDiscountAmount();

  const subtotal = getOrderSubtotal() - discount;

  const isDelivery = order?.type === OrderType.DELIVERY.toString();

  const total = subtotal + (isDelivery ? shippingFee : 0);

  const handleKeypadConfirm = (value: number) => {
    if (keypadType === "DISCOUNT") {
      setDiscount({
        type: discountType,
        value: value,
      });
    } else if (keypadType === "SHIPPING") {
      setShippingFee(value);
    }
    setKeypadOpen(false);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Order Type Selection */}
      <div className="flex items-center gap-2 py-2">
        <span className="text-xs text-muted-foreground shrink-0">
          Order Type
        </span>
        <Select
          value={order?.type || ""}
          onChange={(opt) => setOrderType(opt.value)}
          className="flex-1"
          options={orderTypeOptions}
        />
      </div>

      <Separator />

      {/* Discount Section */}
      <div className="flex items-center gap-2 py-2">
        {/* Discount Button - Opens Keypad on Click */}
        <Button
          onClick={() => setKeypadOpen(true)}
          variant="outline"
          className={cn("flex-1 h-10 justify-start")}
        >
          <span className="text-xs text-muted-foreground mr-2">Discount</span>
          <span className="font-mono font-semibold">{discountValue}</span>
        </Button>

        {/* Discount Type Toggle Buttons */}
        <div className="flex gap-1 p-0.5 bg-muted rounded-md border border-border">
          <Button
            onClick={() =>
              setDiscount({
                type: "PERCENTAGE",
                value: discountValue,
              })
            }
            variant={discountType === "PERCENTAGE" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3 text-xs font-semibold"
            iconName="Percent"
          />
          <Button
            onClick={() =>
              setDiscount({
                type: "FIXED",
                value: discountValue,
              })
            }
            variant={discountType === "FIXED" ? "default" : "ghost"}
            size="sm"
            iconName="DollarSign"
            className="h-8 px-3 text-xs font-semibold"
          />
        </div>
      </div>

      <Separator />

      {/* Shipping Fee Section - Only for Delivery orders */}
      {isDelivery && (
        <>
          <div className="flex items-center gap-2 py-2">
            {/* Shipping Fee Button - Opens Keypad on Click */}
            <Button
              onClick={() => {
                setKeypadType("SHIPPING");
                setKeypadOpen(true);
              }}
              variant="outline"
              className={cn(
                "flex-1 h-10 justify-start",
                shippingFee > 0 && "bg-blue-50"
              )}
            >
              <span className="text-xs text-muted-foreground mr-2">
                Shipping
              </span>
              <span className="font-mono font-semibold">
                ${formatPrice(shippingFee)}
              </span>
            </Button>
          </div>

          <Separator />
        </>
      )}
      <div className="py-3 space-y-2">
        {discount > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium text-destructive">
              -${formatPrice(discount)}
            </span>
          </div>
        )}
        {shippingFee > 0 && isDelivery && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium text-primary">
              +${formatPrice(shippingFee)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">
            ${formatPrice(getOrderSubtotal())}
          </span>
        </div>
      </div>

      <Separator />

      {/* Total Due */}
      <div className="py-2">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total Due</span>
          <span className="text-2xl font-bold text-primary">
            ${formatPrice(total)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <OrderActions
        onCompleteOrder={onCompleteOrder}
        onHoldOrder={onHoldOrder}
        onConfirmWithoutPayment={onConfirmWithoutPayment}
      />

      {/* Numeric Keypad - Works for both Discount and Shipping */}
      <NumericKeypad
        isOpen={keypadOpen}
        onClose={() => setKeypadOpen(false)}
        currentValue={keypadType === "DISCOUNT" ? discountValue : shippingFee}
        onConfirm={handleKeypadConfirm}
        context={keypadContext}
      />
    </div>
  );
};
