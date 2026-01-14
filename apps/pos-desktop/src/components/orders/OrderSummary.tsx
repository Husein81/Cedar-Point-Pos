import { useAuthStore } from "@/store/authStore";
import { useOrderStore } from "@/store/orderStore";
import { BusinessType, OrderType } from "@repo/types";
import { Button, cn, Label, Select, Separator } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useState } from "react";
import { KeypadContext } from "../common/config";
import { NumericKeypad } from "../common/NumericKeypad";
import { formatPrice } from "./config";
import { OrderActions } from "./OrderActions";
import { useModalStore } from "@/store/modalStore";

type OrderSummaryProps = {
  className?: string;
  onCompleteOrder?: () => void;
  onHoldOrder?: () => void;
  onConfirmWithoutPayment?: () => void;
};

type Option = { label: string; value: string };

export const OrderSummary = ({
  className,
  onCompleteOrder,
  onHoldOrder,
  onConfirmWithoutPayment,
}: OrderSummaryProps) => {
  const navigate = useNavigate();
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
  const { openModal, closeModal } = useModalStore();

  const { user } = useAuthStore();
  const order = getActiveOrder();

  const discountValue = order?.discount?.value || 0;
  const discountType = order?.discount?.type || "PERCENTAGE";
  const shippingFee = order?.shippingFee ?? 0;

  const getOrderTypeOptions = (): Option[] => {
    if (user?.tenant?.businessType === BusinessType.RETAIL) {
      return [
        { label: "Retail", value: OrderType.RETAIL.toString() },
        { label: "Delivery", value: OrderType.DELIVERY.toString() },
      ];
    }
    return [
      { label: "Dine In", value: OrderType.DINE_IN.toString() },
      { label: "Takeaway", value: OrderType.TAKEAWAY.toString() },
      { label: "Delivery", value: OrderType.DELIVERY.toString() },
    ];
  };

  const orderTypeOptions = getOrderTypeOptions();
  const discount = getDiscountAmount();
  const isDelivery = order?.type === OrderType.DELIVERY.toString();

  const subtotal = getOrderSubtotal() - discount;
  const total = subtotal + shippingFee;

  const handleKeypadConfirm = (value: number) => {
    if (keypadType === "DISCOUNT") {
      setDiscount({ type: discountType, value });
    } else {
      setShippingFee(value);
    }
    closeModal();
  };

  const handleDiscountTypeChange = (type: "PERCENTAGE" | "FIXED") => {
    setDiscount({ type, value: discountValue });
  };

  const handelShippingFeeEvent = useEffectEvent(() => {
    setShippingFee(0);
  });

  const handleOpenKeypad = () => {
    openModal(
      "",
      <NumericKeypad
        currentValue={keypadType === "DISCOUNT" ? discountValue : shippingFee}
        onConfirm={handleKeypadConfirm}
        context={keypadContext}
        discountType={discountType as "PERCENTAGE" | "FIXED"}
        onDiscountTypeChange={handleDiscountTypeChange}
      />
    );
  };
  useEffect(() => {
    if (!isDelivery) {
      handelShippingFeeEvent();
    }
  }, [isDelivery]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* ONE ROW CONTROLS */}
      <div className="flex gap-2 items-end">
        {/* Order Type */}
        <div className="">
          <Label className="text-xs font-medium text-muted-foreground">
            Order Type
          </Label>
          <Select
            value={order?.type || ""}
            onChange={(opt) => setOrderType(opt.value)}
            options={orderTypeOptions}
          />
        </div>

        {/* Shipping */}
        {isDelivery && (
          <Button
            variant={"outline"}
            className={cn("justify-between")}
            iconName="Van"
            onClick={() => {
              setKeypadType("SHIPPING");
              handleOpenKeypad();
            }}
          />
        )}

        {/* Discount */}
        <Button
          variant="outline"
          className="justify-between"
          onClick={() => {
            setKeypadType("DISCOUNT");
            handleOpenKeypad();
          }}
          iconName="Percent"
        />

        {/* Refund */}
        <Button
          variant="destructive"
          onClick={() => navigate({ to: "/refunds" })}
          iconName="RotateCcw"
        />
      </div>

      <Separator />

      {/* BREAKDOWN */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">
            ${formatPrice(getOrderSubtotal())}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-destructive">
            <span>Discount</span>
            <span>- ${formatPrice(discount)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span>+ ${formatPrice(shippingFee)}</span>
        </div>
      </div>

      <Separator />

      {/* TOTAL */}
      <div className="flex justify-between items-center py-2">
        <span className="text-base font-semibold">Total Due</span>
        <span className="text-2xl font-bold text-primary">
          ${formatPrice(total)}
        </span>
      </div>

      {/* ACTIONS */}
      <OrderActions
        onCompleteOrder={onCompleteOrder}
        onHoldOrder={onHoldOrder}
        onConfirmWithoutPayment={onConfirmWithoutPayment}
      />
    </div>
  );
};
