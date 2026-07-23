// Single-business offline POS enums.
// const objects + type exports (never the `enum` keyword) — same pattern as @repo/types.

export const UserRole = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrderStatus = {
  DRAFT: "DRAFT",
  HELD: "HELD",
  COMPLETED: "COMPLETED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  VOIDED: "VOIDED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
  OTHER: "OTHER",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const DiscountType = {
  PERCENT: "PERCENT",
  FIXED: "FIXED",
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const StockMovementType = {
  SALE: "SALE",
  REFUND: "REFUND",
  PURCHASE: "PURCHASE",
  ADJUSTMENT: "ADJUSTMENT",
  INITIAL: "INITIAL",
} as const;
export type StockMovementType =
  (typeof StockMovementType)[keyof typeof StockMovementType];

export const ShiftStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus];

export const CashMovementType = {
  OPENING_FLOAT: "OPENING_FLOAT",
  CASH_IN: "CASH_IN",
  CASH_OUT: "CASH_OUT",
  SALE: "SALE",
  REFUND: "REFUND",
} as const;
export type CashMovementType =
  (typeof CashMovementType)[keyof typeof CashMovementType];
