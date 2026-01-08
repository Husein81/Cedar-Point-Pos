// ===========================================
//         Enums
// ===========================================
export const BusinessType = {
  RESTAURANT: "RESTAURANT",
  RETAIL: "RETAIL",
} as const;
export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];

export const InventoryChangeType = {
  SET_STOCK: "SET_STOCK", // Direct stock set
  ADJUST_STOCK: "ADJUST_STOCK", // Stock adjustment (increment/decrement)
  SET_MIN_STOCK: "SET_MIN_STOCK", // Minimum stock threshold change
  ORDER_DEDUCT: "ORDER_DEDUCT", // Stock deducted from order
  ORDER_RETURN: "ORDER_RETURN", // Stock returned from refund
  MANUAL_ADJUST: "MANUAL_ADJUST", // Manual adjustment
} as const;
export type InventoryChangeType =
  (typeof InventoryChangeType)[keyof typeof InventoryChangeType];

export const ModifierType = {
  SINGLE: "SINGLE", // Only one modifier can be selected
  MULTIPLE: "MULTIPLE", // Multiple modifiers can be selected
} as const;
export type ModifierType = (typeof ModifierType)[keyof typeof ModifierType];

export const OrderType = {
  DINE_IN: "DINE_IN",
  TAKEAWAY: "TAKEAWAY",
  DELIVERY: "DELIVERY",
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderStatus = {
  DRAFT: "DRAFT", // New: For orders being built on the POS
  ON_HOLD: "ON_HOLD", // Held by cashier
  PENDING: "PENDING", // Order created but not processed
  SENT_TO_KITCHEN: "SENT_TO_KITCHEN", // Order sent to kitchen/bar
  READY: "READY", // Ready for pickup/serve
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const SortOrder = {
  ASC: "asc",
  DESC: "desc",
} as const;
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export const TransferStatus = {
  PENDING: "PENDING",
  IN_TRANSIT: "IN_TRANSIT",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type TransferStatus =
  (typeof TransferStatus)[keyof typeof TransferStatus];

export const UserRole = {
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PaymentMethod = {
  CASH: "CASH",
  CREDIT_CARD: "CREDIT_CARD",
  DEBIT_CARD: "DEBIT_CARD",
  MOBILE_PAYMENT: "MOBILE_PAYMENT",
  GIFT_CARD: "GIFT_CARD",
  OTHER: "OTHER",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ShiftStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus];
