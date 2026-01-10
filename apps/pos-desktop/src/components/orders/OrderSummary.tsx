import { OrderActions } from "./OrderActions";
import { Input, Select, Separator } from "@repo/ui";
import { useOrderStore } from "@/store/orderStore";
import { cn } from "@repo/ui";
import { useMemo } from "react";
import { formatPrice } from "./config";

type OrderSummaryProps = {
  className?: string;
  onCompleteOrder?: () => void;
  onHoldOrder?: () => void;
  onSplitBill?: () => void;
  onConfirmWithoutPayment?: () => void;
  taxRate?: number; // Tax rate as percentage (e.g., 10 for 10%)
};

export const OrderSummary = ({
  className,
  onCompleteOrder,
  onHoldOrder,
  onSplitBill,
  onConfirmWithoutPayment,
  taxRate = 0, // Default 0% tax
}: OrderSummaryProps) => {
  const { getActiveOrder, setDiscount, getOrderSubtotal, getDiscountAmount } =
    useOrderStore();

  const order = getActiveOrder();

  const discountValue = order?.discount?.value || 0;
  const discountType = order?.discount?.type || "PERCENTAGE";

  const subtotal = useMemo(() => getOrderSubtotal(), [getOrderSubtotal, order]);
  const discount = useMemo(
    () => getDiscountAmount(),
    [getDiscountAmount, order]
  );

  // Calculate tax based on subtotal after discount
  const taxableAmount = subtotal - discount;
  const taxAmount = useMemo(
    () => (taxableAmount * taxRate) / 100,
    [taxableAmount, taxRate]
  );

  const total = useMemo(
    () => taxableAmount + taxAmount,
    [taxableAmount, taxAmount]
  );

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Discount Section */}
      <div className="flex items-center gap-3 py-3">
        <span className="text-sm text-muted-foreground shrink-0">Discount</span>

        <Input
          type="number"
          min={0}
          max={discountType === "PERCENTAGE" ? 100 : subtotal}
          value={discountValue}
          className="flex-1 h-8"
          onChange={(e) =>
            setDiscount({
              type: discountType,
              value: Math.max(0, Number(e.target.value)),
            })
          }
        />

        <Select
          value={discountType}
          onChange={(opt) =>
            setDiscount({
              type: opt.value as "PERCENTAGE" | "FIXED",
              value: discountValue,
            })
          }
          className="w-16"
          options={[
            { label: "%", value: "PERCENTAGE" },
            { label: "$", value: "FIXED" },
          ]}
        />
      </div>

      <Separator />

      {/* Totals Breakdown */}
      <div className="py-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">${formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium text-destructive">
              -${formatPrice(discount)}
            </span>
          </div>
        )}
        {taxRate > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax ({taxRate}%)</span>
            <span className="font-medium">${formatPrice(taxAmount)}</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Total Due */}
      <div className="py-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total Due</span>
          <span className="text-3xl font-bold text-primary">
            ${formatPrice(total)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <OrderActions
        onCompleteOrder={onCompleteOrder}
        onHoldOrder={onHoldOrder}
        onSplitBill={onSplitBill}
        onConfirmWithoutPayment={onConfirmWithoutPayment}
      />
    </div>
  );
};
