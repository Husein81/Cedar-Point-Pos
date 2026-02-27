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
  ORDER_DEDUCTION: "ORDER_DEDUCTION", // Stock deducted when order is placed (legacy)
  SALE: "SALE", // Stock sold through completed order
  REFUND: "REFUND", // Stock returned from refund
  MANUAL_ADJUST: "MANUAL_ADJUST", // Manual adjustment
  TRANSFER_OUT: "TRANSFER_OUT", // Stock transferred to another branch
  TRANSFER_IN: "TRANSFER_IN", // Stock received from another branch
  PURCHASE_ORDER_RECEIVE: "PURCHASE_ORDER_RECEIVE", // Stock received from purchase order
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
  RETAIL: "RETAIL",
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderStatus = {
  DRAFT: "DRAFT", // New: For orders being built on the POS
  ON_HOLD: "ON_HOLD", // Held by cashier
  CONFIRMED: "CONFIRMED", // Restaurant: Order confirmed by staff
  IN_PROGRESS: "IN_PROGRESS", // Restaurant: Order being prepared
  PENDING: "PENDING", // Order created but not processed
  SENT_TO_KITCHEN: "SENT_TO_KITCHEN", // Order sent to kitchen/bar
  READY: "READY", // Ready for pickup/serve
  PAID: "PAID", // Payment received, inventory deducted
  PARTIALLY_PAID: "PARTIALLY_PAID", // Partial payment received
  COMPLETED: "COMPLETED", // Order fully completed
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED", // Order partially refunded
  FULLY_REFUNDED: "FULLY_REFUNDED", // Order fully refunded
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
  KITCHEN: "KITCHEN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
  CREDIT: "CREDIT",
  VOUCHER: "VOUCHER",
  ONLINE: "ONLINE",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ShiftStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus];

export const LoyaltyEnrollmentMode = {
  AUTO: "AUTO",
  MANUAL: "MANUAL",
  INVITE_ONLY: "INVITE_ONLY",
} as const;
export type LoyaltyEnrollmentMode =
  (typeof LoyaltyEnrollmentMode)[keyof typeof LoyaltyEnrollmentMode];

export const LoyaltyTransactionType = {
  EARN: "EARN",
  REDEEM: "REDEEM",
  REFUND_RESTORE_REDEEM: "REFUND_RESTORE_REDEEM",
  REFUND_REVERSE_EARN: "REFUND_REVERSE_EARN",
  MANUAL_ADJUSTMENT: "MANUAL_ADJUSTMENT",
  RECONCILE_RESTORE: "RECONCILE_RESTORE",
} as const;
export type LoyaltyTransactionType =
  (typeof LoyaltyTransactionType)[keyof typeof LoyaltyTransactionType];

export const LoyaltyDirection = {
  CREDIT: "CREDIT",
  DEBIT: "DEBIT",
} as const;
export type LoyaltyDirection =
  (typeof LoyaltyDirection)[keyof typeof LoyaltyDirection];

export const TableStatus = {
  AVAILABLE: "AVAILABLE", // Table is free and ready for guests
  OCCUPIED: "OCCUPIED", // Table has active guests/order
  RESERVED: "RESERVED", // Table is reserved for upcoming guests
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const PurchaseOrderStatus = {
  PENDING: "PENDING",
  ORDERED: "ORDERED",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
} as const;
export type PurchaseOrderStatus =
  (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const PurchaseOrderItemType = {
  PRODUCT: "PRODUCT",
  CUSTOM: "CUSTOM",
} as const;
export type PurchaseOrderItemType =
  (typeof PurchaseOrderItemType)[keyof typeof PurchaseOrderItemType];
