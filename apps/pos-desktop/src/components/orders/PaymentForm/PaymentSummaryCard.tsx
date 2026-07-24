import { Icon, cn } from "@repo/ui";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { formatPrice } from "../config";

type Props = {
  isFullyPaid: boolean;
  total: number;
  currencySymbol: string;
  remainingInCurrency: number;
};

export default function PaymentSummaryCard({
  isFullyPaid,
  total,
  currencySymbol,
  remainingInCurrency,
}: Props) {
  // `total` is always in the tenant's base currency (unlike `remainingInCurrency`,
  // which reflects whatever currency was selected for this payment).
  const { symbol: baseSymbol } = useBaseCurrency();

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Total */}
      <div className="text-center py-3 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Total
        </p>
        <p className="text-2xl font-bold">
          {baseSymbol}
          {formatPrice(total)}
        </p>
      </div>

      {/* Remaining */}
      <div
        className={cn(
          "text-center py-3 rounded-lg transition-colors",
          isFullyPaid ? "bg-green-500/10" : "bg-orange-500/10",
        )}
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Remaining
        </p>
        <p
          className={cn(
            "text-2xl font-bold",
            isFullyPaid ? "text-green-600" : "text-orange-600",
          )}
        >
          {isFullyPaid ? (
            <span className="flex items-center justify-center gap-1">
              <Icon name="Check" className="w-5 h-5" />
              Paid
            </span>
          ) : (
            <>
              {currencySymbol}
              {formatPrice(remainingInCurrency)}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
