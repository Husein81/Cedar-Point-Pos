export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return "N/A";
  return new Intl.NumberFormat("en-LB", {
    style: "decimal",
  }).format(price);
};

/**
 * Format a payment amount with currency code
 * e.g., "5,874,000 LBP" or "66.00 USD"
 */
export const formatPaymentAmount = (
  amount: number,
  currencyCode: string = "USD"
): string => {
  return `${formatPrice(amount)} ${currencyCode}`;
};

/**
 * Convert foreign currency amount to base currency
 * Used for display purposes only (validation happens on backend)
 */
export const toBaseCurrency = (
  amount: number,
  exchangeRate: number | null | undefined
): number => {
  if (!exchangeRate || exchangeRate <= 0) return amount;
  return amount / exchangeRate;
};

export const generateQuickCashAmounts = (total: number) => {
  const results = new Set<number>();

  const roundedTo1 = Math.ceil(total);
  results.add(roundedTo1);
  results.add(Math.ceil(total / 5) * 5);
  results.add(Math.ceil(total / 10) * 10);
  results.add(Math.ceil(total / 20) * 20);
  results.add(Math.ceil(total / 50) * 50);
  results.add(Math.ceil(total / 100) * 100);

  return Array.from(results)
    .filter((v) => v > total)
    .sort((a, b) => a - b)
    .slice(0, 6);
};
