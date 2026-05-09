import { CurrencyAmount } from "@/utils/invoiceFinancials";

export function PriceStack({
  amounts,
  className,
  negative,
}: {
  amounts: CurrencyAmount[];
  className?: string;
  negative?: boolean;
}) {
  if (amounts.length === 0) return null;
  const primary = amounts[0]!;
  const secondaries = amounts.slice(1);
  const sign = negative ? "−" : "";

  return (
    <div className={className}>
      <span className="font-semibold tabular-nums">
        {sign}
        {primary.formatted}
      </span>
      {secondaries.map((s) => (
        <span
          key={s.code}
          className="block text-xs text-muted-foreground font-mono tabular-nums"
        >
          {sign}
          {s.formatted}
        </span>
      ))}
    </div>
  );
}
