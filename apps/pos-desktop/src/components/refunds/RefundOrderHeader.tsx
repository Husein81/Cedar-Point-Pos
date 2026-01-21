type OrderHeaderProps = {
  orderDetails: {
    orderNumber: string | null;
    orderTotal: number;
    totalRefundable: number;
  };
};

export const OrderHeader = ({ orderDetails }: OrderHeaderProps) => (
  <div className="px-4 py-4 border-b bg-background">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Order</p>
        <h2 className="text-lg font-bold">
          #{orderDetails.orderNumber || "N/A"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Original:{" "}
          <span className="font-semibold text-foreground">
            ${orderDetails.orderTotal.toFixed(2)}
          </span>
        </p>
      </div>

      <div className="rounded-lg border bg-primary/5 border-primary/20 px-3 py-2 text-right">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Refundable
        </p>
        <p className="text-2xl font-bold text-primary tabular-nums">
          ${orderDetails.totalRefundable.toFixed(2)}
        </p>
      </div>
    </div>
  </div>
);
