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
  CASH: "CASH", // LBP / USD cash
  CARD: "CARD", // Debit / Credit card (limited)
  CASH_CARD: "CASH_CARD", // Split payment
  WHISH_MONEY: "WHISH_MONEY", // Whish Money wallet
  OMT: "OMT", // OMT wallet / transfer
  WESTERN_UNION: "WESTERN_UNION", // Rare but exists
  QR_PAYMENT: "QR_PAYMENT", // Local QR wallets
  STORE_CREDIT: "STORE_CREDIT", // House account
  PAY_LATER: "PAY_LATER", // Trusted customers / tabs
  ONLINE_PREPAID: "ONLINE_PREPAID", // Paid online before arrival
  DELIVERY_CASH: "DELIVERY_CASH", // Cash collected by driver
  REFUND: "REFUND",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ShiftStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus];
