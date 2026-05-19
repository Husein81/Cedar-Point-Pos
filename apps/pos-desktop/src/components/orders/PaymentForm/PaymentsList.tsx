import { Badge, Button, Icon } from "@repo/ui";
import { formatPrice } from "../config";
import { PaymentEntry } from ".";
import { TenantCurrency } from "@repo/types";

type Props = {
  payments: PaymentEntry[];
  baseCurrency: TenantCurrency;
  getCurrencySymbol: (val: string) => string;
  handleRemovePayment: (id: string) => void;
};

export default function PaymentsList({
  payments,
  getCurrencySymbol,
  baseCurrency,
  handleRemovePayment,
}: Props) {
  return (
    <div>
      {payments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Payments
            </span>
            <Badge variant="secondary" className="text-xs">
              {payments.length}
            </Badge>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="outline" className="text-xs">
                    {p.method}
                  </Badge>
                  <div>
                    <span className="font-mono text-sm font-medium">
                      {getCurrencySymbol(p.currencyCode)}{" "}
                      {formatPrice(p.amount)}
                    </span>
                    {/* Show conversion if not in base currency */}
                    {p.currencyCode !== baseCurrency?.currencyCode && (
                      <p className="text-xs text-muted-foreground font-mono">
                        ≈ ${formatPrice(p.amountInBase)}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePayment(p.id)}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Icon name="X" className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
