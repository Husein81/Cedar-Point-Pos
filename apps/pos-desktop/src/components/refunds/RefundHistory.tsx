import { useOrderRefunds } from "@/hooks/useRefund";
import { Badge, Icon, Shad } from "@repo/ui";
import { formatPrice } from "../orders/config";

type Props = {
  orderId?: string;
};

export const RefundHistory = ({ orderId }: Props) => {
  const { data: refunds, isLoading } = useOrderRefunds(orderId || "");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon
          name="LoaderCircle"
          className="w-5 h-5 animate-spin text-muted-foreground"
        />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading refund history...
        </span>
      </div>
    );
  }

  if (!refunds || refunds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Icon
          name="ReceiptText"
          className="w-8 h-8 text-muted-foreground mb-2"
        />
        <p className="text-sm text-muted-foreground">
          No refunds {orderId ? "for this order" : "found"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Refund History
        </h3>
        <Badge variant="outline">{refunds.length} refund(s)</Badge>
      </div>

      <div className="space-y-3">
        {refunds.map((refund: any) => (
          <Shad.Card key={refund.id} className="overflow-hidden">
            <Shad.CardHeader className="py-3 px-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="RotateCcw" className="w-4 h-4 text-destructive" />
                  <span className="font-semibold text-destructive">
                    -${formatPrice(Number(refund.totalAmount))}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(refund.refundedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </Shad.CardHeader>
            <Shad.CardContent className="py-3 px-4">
              {/* Refund Items */}
              <div className="space-y-2">
                {refund.refundItems?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {item.quantity}×
                      </span>
                      <span>
                        {/* Show product name from manual refund or order item */}
                        {refund.manualRefund
                          ? item.productName
                          : item.orderItem?.product?.name || "Unknown"}
                      </span>
                    </div>
                    <span className="font-mono">
                      ${formatPrice(Number(item.subtotal))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Payment Method - for manual refunds */}
              {refund.manualRefund && refund.paymentMethod && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Payment Method
                  </p>
                  <p className="text-sm font-medium">{refund.paymentMethod}</p>
                </div>
              )}

              {/* Reason */}
              {refund.reason && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="text-sm">{refund.reason}</p>
                </div>
              )}
            </Shad.CardContent>
          </Shad.Card>
        ))}
      </div>

      {/* Total Refunded Summary */}
      <div className="flex justify-between items-center pt-3 border-t">
        <span className="font-medium">Total Refunded</span>
        <span className="text-lg font-bold text-destructive">
          -$
          {formatPrice(
            refunds.reduce(
              (sum: number, r: any) => sum + Number(r.totalAmount),
              0
            )
          )}
        </span>
      </div>
    </div>
  );
};
