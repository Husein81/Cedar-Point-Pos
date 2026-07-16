import { useOrderRefunds } from "@/hooks/useRefund";
import { Icon } from "@repo/ui";
import { formatPrice } from "../orders/config";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { useState } from "react";

type Props = {
  orderId?: string;
};

export const RefundHistory = ({ orderId }: Props) => {
  const { data: refunds, isLoading } = useOrderRefunds(orderId || "");
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground flex items-center gap-2">
        <Icon name="LoaderCircle" className="w-3 h-3 animate-spin" />
        Loading refunds…
      </div>
    );
  }

  if (!refunds || refunds.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground">
        No refunds recorded
      </div>
    );
  }

  const totalRefunded = refunds.reduce(
    (sum: number, r: any) => sum + Number(r.totalAmount),
    0,
  );

  return (
    <div className="border rounded-md text-sm overflow-hidden">
      {/* Header */}
      <div className="bg-muted px-3 py-2 flex justify-between text-xs font-semibold uppercase tracking-wide">
        <span>Refunds</span>
        <span>{refunds.length}</span>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {refunds.map((refund: any) => {
          const isOpen = openId === refund.id;

          return (
            <div key={refund.id}>
              {/* Row */}
              <button
                onClick={() => setOpenId(isOpen ? null : refund.id)}
                className="
                  w-full px-3 py-2 flex items-center justify-between
                  hover:bg-muted/40 transition-colors text-left
                "
              >
                {/* Time */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon name="RotateCcw" className="w-3.5 h-3.5" />
                  {new Date(refund.refundedAt).toLocaleTimeString(DEFAULT_LOCALE, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                {/* Label */}
                <div className="text-xs font-medium text-muted-foreground">
                  REFUND
                </div>

                {/* Amount */}
                <div className="font-mono font-semibold text-destructive">
                  -${formatPrice(Number(refund.totalAmount))}
                </div>
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div className="bg-muted/30 px-4 py-3 text-xs space-y-2">
                  {/* Items */}
                  {refund.refundItems?.map((item: any) => (
                    <div key={item.id} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">
                        {item.quantity}×{" "}
                        {refund.manualRefund
                          ? item.productName
                          : item.orderItem?.product?.name || "Unknown"}
                      </span>
                      <span className="font-mono">
                        ${formatPrice(Number(item.subtotal))}
                      </span>
                    </div>
                  ))}

                  {/* Payment Method */}
                  {refund.manualRefund && refund.paymentMethod && (
                    <div className="pt-2 border-t text-muted-foreground">
                      Payment: {refund.paymentMethod}
                    </div>
                  )}

                  {/* Reason */}
                  {refund.reason && (
                    <div className="pt-2 border-t text-muted-foreground">
                      Reason: {refund.reason}
                    </div>
                  )}

                  {/* Loyalty Points */}
                  {(refund.loyaltyPointsRestored > 0 ||
                    refund.loyaltyPointsReversed > 0) && (
                    <div className="pt-2 border-t space-y-1">
                      {refund.loyaltyPointsRestored > 0 && (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <Icon name="Award" className="w-3 h-3" />
                          <span>
                            {refund.loyaltyPointsRestored.toLocaleString()} pts
                            restored
                          </span>
                        </div>
                      )}
                      {refund.loyaltyPointsReversed > 0 && (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <Icon name="Award" className="w-3 h-3" />
                          <span>
                            {refund.loyaltyPointsReversed.toLocaleString()} pts
                            reversed
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex justify-between text-sm font-semibold border-t bg-muted/40">
        <span>Total Refunded</span>
        <span className="font-mono text-destructive">
          -${formatPrice(totalRefunded)}
        </span>
      </div>
    </div>
  );
};
