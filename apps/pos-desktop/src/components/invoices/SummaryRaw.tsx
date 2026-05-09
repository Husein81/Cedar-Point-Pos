import { CurrencyAmount } from "@/utils/invoiceFinancials";
import { PriceStack } from "./PriceStack";
import { Icon } from "@repo/ui";

export function SummaryRow({
  label,
  hint,
  amounts,
  negative,
  muted,
  bold,
  large,
  icon,
}: {
  label: string;
  hint?: string;
  amounts: CurrencyAmount[];
  negative?: boolean;
  muted?: boolean;
  bold?: boolean;
  large?: boolean;
  icon?: string;
}) {
  return (
    <div className={`flex items-start justify-between ${large ? "py-1" : ""}`}>
      <div className="space-y-0.5">
        <div
          className={`flex items-center gap-1.5 ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""} ${large ? "text-base" : "text-sm"}`}
        >
          {icon && (
            <Icon name={icon} className="w-3.5 h-3.5 shrink-0 opacity-60" />
          )}
          {label}
        </div>
        {hint && (
          <p className="text-xs text-muted-foreground leading-tight">{hint}</p>
        )}
      </div>
      <PriceStack
        amounts={amounts}
        negative={negative}
        className={`text-right ${negative ? "text-destructive" : ""} ${muted ? "text-muted-foreground" : ""} ${bold ? "font-semibold" : ""} ${large ? "text-base" : "text-sm"}`}
      />
    </div>
  );
}
