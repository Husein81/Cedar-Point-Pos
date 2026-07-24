import { useBaseCurrency } from "@/hooks/useCurrency";

type OrderHeaderProps = {
  orderDetails: {
    orderNumber: string | null;
    orderTotal: number;
    totalRefundable: number;
  };
};

export const OrderHeader = ({ orderDetails }: OrderHeaderProps) => {
  const { format: formatMoney } = useBaseCurrency();

  return (
    <div className="px-5 py-4 border-b border-border/40 bg-background">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Order</p>
          <h2 className="text-base font-bold tabular-nums">
            #{orderDetails.orderNumber || "N/A"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Total:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatMoney(orderDetails.orderTotal)}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-right">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Refundable
          </p>
          <p className="text-xl font-bold text-primary tabular-nums">
            {formatMoney(orderDetails.totalRefundable)}
          </p>
        </div>
      </div>
    </div>
  );
};
