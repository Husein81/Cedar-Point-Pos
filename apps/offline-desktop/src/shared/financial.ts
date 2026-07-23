// Financial math shared by main (authoritative totals at checkout) and
// renderer (live cart preview). Same code path on both sides guarantees
// the preview always matches what gets persisted.

import { DiscountType } from "./enums";

export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function discountAmount(
  base: number,
  type: DiscountType | null,
  value: number,
): number {
  if (!type || value <= 0) return 0;
  const amount =
    type === DiscountType.PERCENT ? (base * value) / 100 : Math.min(value, base);
  return roundMoney(Math.min(amount, base));
}

export type CartLine = {
  quantity: number;
  unitPrice: number;
  discountType: DiscountType | null;
  discountValue: number;
};

export function lineTotal(line: CartLine): number {
  const gross = line.quantity * line.unitPrice;
  return roundMoney(gross - discountAmount(gross, line.discountType, line.discountValue));
}

export type OrderTotalsInput = {
  lines: CartLine[];
  discountType: DiscountType | null;
  discountValue: number;
  taxRate: number;
};

export type OrderTotals = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
};

// Tax is applied on the discounted subtotal (tax-exclusive pricing).
export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = roundMoney(
    input.lines.reduce((sum, line) => sum + lineTotal(line), 0),
  );
  const orderDiscount = discountAmount(
    subtotal,
    input.discountType,
    input.discountValue,
  );
  const taxable = roundMoney(subtotal - orderDiscount);
  const taxAmount = roundMoney(taxable * input.taxRate);
  const total = roundMoney(taxable + taxAmount);

  return { subtotal, discountAmount: orderDiscount, taxAmount, total };
}
