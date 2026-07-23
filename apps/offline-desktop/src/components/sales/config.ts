export type KeypadContext =
  | "QUANTITY"
  | "PRICE_OVERRIDE"
  | "DISCOUNT_PERCENT"
  | "DISCOUNT_FIXED"
  | undefined;

export const KEYPAD_CONFIG: Record<
  Exclude<KeypadContext, undefined>,
  {
    label: string;
    minValue: number;
    maxValue: number;
    decimals: number;
    allowZero: boolean;
  }
> = {
  QUANTITY: {
    label: "Edit Quantity",
    minValue: 0,
    maxValue: 999,
    decimals: 0,
    allowZero: true,
  },
  PRICE_OVERRIDE: {
    label: "Custom Price",
    minValue: 0,
    maxValue: 99999.99,
    decimals: 2,
    allowZero: false,
  },
  DISCOUNT_PERCENT: {
    label: "Discount (%)",
    minValue: 0,
    maxValue: 100,
    decimals: 2,
    allowZero: true,
  },
  DISCOUNT_FIXED: {
    label: "Discount (Fixed)",
    minValue: 0,
    maxValue: 99999.99,
    decimals: 2,
    allowZero: true,
  },
};

export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "decimal" }).format(price);
};

export const generateQuickCashAmounts = (total: number) => {
  const results = new Set<number>();

  results.add(Math.ceil(total));
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
