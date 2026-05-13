import { OrderItem } from "@/dto/order.dto";

export const toItemDto = (item: OrderItem) => ({
  productId: item.productId,
  quantity: item.quantity,
  unitPrice: item.price,
  discount: item.discount ?? undefined,
  notes: item.notes ?? undefined,
  modifiers: item.modifiers?.map((m) => m.modifierId),
});

export const roundTo = (value: number, decimals: number = 2): number => {
  const multiplier = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

/**
 * Sums multiple currency values safely.
 */
export const sumCurrency = (...values: number[]): number => {
  const cents = values.reduce((acc, v) => acc + Math.round(v * 100), 0);
  return cents / 100;
};

/**
 * Subtracts currency values safely.
 */
export const subtractCurrency = (
  base: number,
  ...toSubtract: number[]
): number => {
  let cents = Math.round(base * 100);
  for (const v of toSubtract) {
    cents -= Math.round(v * 100);
  }
  return cents / 100;
};

/**
 * Parses a string to a safe financial number.
 */
export const parseAmount = (value: string | number): number => {
  const n = typeof value === "string" ? parseFloat(value || "0") : value;
  return isNaN(n) ? 0 : roundTo(n, 2);
};
