import { ActiveTableOrder, TableOverview } from "@/dto/tables.dto";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { cn, Icon } from "@repo/ui";
import { memo } from "react";
import { EmptyTab } from ".";

export const PaymentsTab = memo(function PaymentsTab({
  summary,
  fullOrder,
}: {
  summary: TableOverview["activeOrder"];
  fullOrder: ActiveTableOrder | null;
}) {
  const { format: formatMoney } = useBaseCurrency();

  if (!summary) {
    return <EmptyTab icon="CreditCard" text="No payments for this table" />;
  }

  const total = Number(summary.total);
  const paid = summary.paidAmount;
  const remaining = Math.max(0, total - paid);
  const payments = fullOrder?.payments ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <PaymentStat label="Total" value={formatMoney(total)} />
        <PaymentStat
          label="Paid"
          value={formatMoney(paid)}
          className="text-emerald-600 dark:text-emerald-400"
        />
        <PaymentStat
          label="Remaining"
          value={formatMoney(remaining)}
          className={
            remaining > 0 ? "text-amber-600 dark:text-amber-400" : undefined
          }
        />
      </div>

      {payments.length > 0 && (
        <ul className="space-y-1.5">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between rounded-lg border p-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <Icon
                  name="CreditCard"
                  className="text-muted-foreground h-4 w-4"
                />
                {payment.method}
                <span className="text-muted-foreground text-xs">
                  {new Date(payment.paidAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
              <span className="font-medium">
                {formatMoney(payment.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

function PaymentStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
        {label}
      </p>
      <p className={cn("text-sm font-bold", className)}>{value}</p>
    </div>
  );
}
