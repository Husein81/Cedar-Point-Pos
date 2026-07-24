import { OrderItem } from "@/dto/order.dto";

export const toItemDto = (item: OrderItem) => ({
  productId: item.productId,
  quantity: item.quantity,
  unitPrice: item.price,
  discount: item.discount ?? undefined,
  notes: item.notes ?? undefined,
  modifiers: item.modifiers?.map((m) => m.modifierId),
});

/**
 * Per-line money math. Single source of truth so the cart, the totals bar and
 * the printed receipt can never disagree about what a line costs — a receipt
 * that omits an item discount is a bill the customer is overcharged on.
 */

/** Unit price including any modifier surcharges. */
export const getItemUnitPrice = (item: OrderItem): number => {
  const modifiersTotal =
    item.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0;
  return (item.price ?? 0) + modifiersTotal;
};

/** Discount applied across the whole line (percentage is of the line total). */
export const getItemDiscountAmount = (item: OrderItem): number => {
  if (!item.discount) return 0;
  const lineTotal = getItemUnitPrice(item) * item.quantity;
  return item.discount.type === "PERCENTAGE"
    ? lineTotal * (item.discount.value / 100)
    : item.discount.value;
};

/** What the line actually costs: modifiers in, its own discount out. */
export const getItemLineTotal = (item: OrderItem): number =>
  getItemUnitPrice(item) * item.quantity - getItemDiscountAmount(item);

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
