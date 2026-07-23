import { useState } from "react";
import { Badge, Button, Icon, Shad } from "@repo/ui";
import { useOrderDetails } from "@/hooks/useOrder";
import { useSettings } from "@/hooks/useSettings";
import { OrderStatus } from "@/shared/enums";
import { formatDate, formatMoney } from "@/utils/format";
import { printReceipt } from "@/utils/receipt";
import { RefundDialog } from "./RefundDialog";

type Props = {
  orderId: string | null;
  onClose: () => void;
  currencySymbol: string;
};

const statusVariant = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.COMPLETED:
      return "default" as const;
    case OrderStatus.REFUNDED:
    case OrderStatus.PARTIALLY_REFUNDED:
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
};

export const OrderDetailsDialog = ({
  orderId,
  onClose,
  currencySymbol,
}: Props) => {
  const { data: order, isLoading } = useOrderDetails(orderId ?? "");
  const { data: settings } = useSettings();
  const [isRefundOpen, setIsRefundOpen] = useState(false);

  const canRefund =
    order &&
    (order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.PARTIALLY_REFUNDED);

  return (
    <Shad.Dialog open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <Shad.DialogContent className="max-w-lg">
        {isLoading || !order ? (
          <div className="flex justify-center py-12">
            <Icon name="LoaderCircle" className="animate-spin" />
          </div>
        ) : (
          <>
            <Shad.DialogHeader>
              <Shad.DialogTitle className="flex items-center gap-2">
                {order.orderNumber}
                <Badge variant={statusVariant(order.status)}>
                  {order.status.replace("_", " ")}
                </Badge>
              </Shad.DialogTitle>
              <Shad.DialogDescription>
                {formatDate(order.createdAt)} · {order.userName ?? "Unknown"} ·{" "}
                {order.customerName ?? "Walk-in"}
              </Shad.DialogDescription>
            </Shad.DialogHeader>

            {/* Items */}
            <div className="rounded-md border divide-y">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between px-3 py-2 text-sm"
                >
                  <span>
                    {item.quantity} × {item.productName}
                  </span>
                  <span>{formatMoney(item.lineTotal, currencySymbol)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal, currencySymbol)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>
                    -{formatMoney(order.discountAmount, currencySymbol)}
                  </span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{formatMoney(order.taxAmount, currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatMoney(order.total, currencySymbol)}</span>
              </div>
              {order.changeDue > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Change given</span>
                  <span>{formatMoney(order.changeDue, currencySymbol)}</span>
                </div>
              )}
            </div>

            {/* Payments */}
            <div className="text-xs text-muted-foreground">
              Paid via{" "}
              {order.payments
                .map(
                  (payment) =>
                    `${payment.method} ${formatMoney(payment.amount, currencySymbol)}`,
                )
                .join(", ")}
            </div>

            <Shad.DialogFooter>
              <Button
                variant="outline"
                onClick={() => settings && printReceipt(order, settings)}
                disabled={!settings}
              >
                <Icon name="Printer" className="w-4 h-4 mr-1.5" />
                Print
              </Button>
              {canRefund && (
                <Button
                  variant="destructive"
                  onClick={() => setIsRefundOpen(true)}
                >
                  Refund
                </Button>
              )}
            </Shad.DialogFooter>

            <RefundDialog
              open={isRefundOpen}
              onOpenChange={setIsRefundOpen}
              order={order}
              currencySymbol={currencySymbol}
            />
          </>
        )}
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
