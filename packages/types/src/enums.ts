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
  PURCHASE_IN: "PURCHASE_IN", // Stock received from a purchase order
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

/**
 * Fulfillment status — tracks the order's journey through service.
 * Payment state lives on the independent PaymentStatus axis, never here.
 */
export const OrderStatus = {
  DRAFT: "DRAFT", // Being built on the POS; not visible to kitchen
  PLACED: "PLACED", // Committed: sent to kitchen (restaurant) or confirmed unpaid (retail credit sale)
  PREPARING: "PREPARING", // Kitchen actively cooking
  READY: "READY", // On the pass, awaiting runner / pickup
  SERVED: "SERVED", // Food delivered; guests dining, bill open (dine-in)
  COMPLETED: "COMPLETED", // Closed: paid in full and service finished
  CANCELLED: "CANCELLED", // Aborted pre-completion; audited when post-fire
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * Payment status — derived server-side from sum(payments)/sum(refunds) vs
 * total. Never set directly by a client.
 */
export const PaymentStatus = {
  UNPAID: "UNPAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Kitchen ticket lifecycle (OrderItemTicket.status). */
export const TicketStatus = {
  QUEUED: "QUEUED",
  PREPARING: "PREPARING",
  READY: "READY",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

/**
 * THE single source of truth for "this order keeps its table in service /
 * counts as open". COMPLETED and CANCELLED are the only exits.
 */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.PLACED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
] as const;

/** Terminal statuses — no transitions out, order is locked. */
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
] as const;

/**
 * Statuses in which items may still be added to a restaurant order
 * (new items fire fresh kitchen tickets). Removing/decreasing already-sent
 * items is a manager action. Retail orders are only editable in DRAFT.
 */
export const EDITABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.PLACED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
] as const;

/** Payment states that still owe money (drives "debts" reporting). */
export const OWING_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  PaymentStatus.UNPAID,
  PaymentStatus.PARTIALLY_PAID,
] as const;

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
  WAITER: "WAITER", // Restaurant floor staff
  DRIVER: "DRIVER", // Delivery staff
  INVENTORY_STAFF: "INVENTORY_STAFF", // Warehouse / stock staff
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Canonical action names recorded in the StaffActivityLog audit trail.
// Backend writes these via the @LogActivity decorator; frontends use them for display.
export const StaffActivityAction = {
  REFUND_CREATED: "REFUND_CREATED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  DISCOUNT_APPLIED: "DISCOUNT_APPLIED",
  STOCK_ADJUSTED: "STOCK_ADJUSTED",
  SHIFT_OPENED: "SHIFT_OPENED",
  SHIFT_CLOSED: "SHIFT_CLOSED",
  DRAWER_OPENED: "DRAWER_OPENED",
  // Staff management (high-privilege; always audited)
  STAFF_CREATED: "STAFF_CREATED",
  STAFF_UPDATED: "STAFF_UPDATED",
  STAFF_ACTIVE_TOGGLED: "STAFF_ACTIVE_TOGGLED",
  STAFF_POS_TOGGLED: "STAFF_POS_TOGGLED",
  STAFF_PIN_SET: "STAFF_PIN_SET",
  STAFF_PASSWORD_RESET: "STAFF_PASSWORD_RESET",
  STAFF_SESSION_ENDED: "STAFF_SESSION_ENDED",
} as const;
export type StaffActivityAction =
  (typeof StaffActivityAction)[keyof typeof StaffActivityAction];

// Module a staff activity belongs to (used for filtering the audit trail).
export const StaffActivityModule = {
  ORDERS: "orders",
  INVENTORY: "inventory",
  PAYMENTS: "payments",
  SHIFTS: "shifts",
  REFUNDS: "refunds",
  STAFF: "staff",
} as const;
export type StaffActivityModule =
  (typeof StaffActivityModule)[keyof typeof StaffActivityModule];

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

export const CashMovementType = {
  CASH_IN: "CASH_IN",
  CASH_OUT: "CASH_OUT",
  CASH_SALE: "CASH_SALE",
  CASH_CHANGE: "CASH_CHANGE",
  CASH_REFUND_OUT: "CASH_REFUND_OUT",
  CASH_REFUND_CORRECTION: "CASH_REFUND_CORRECTION",
  OPENING_CASH: "OPENING_CASH",
} as const;
export type CashMovementType =
  (typeof CashMovementType)[keyof typeof CashMovementType];

export const CashMovementReferenceType = {
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
  ORDER: "ORDER",
  SHIFT: "SHIFT",
  MANUAL: "MANUAL",
} as const;
export type CashMovementReferenceType =
  (typeof CashMovementReferenceType)[keyof typeof CashMovementReferenceType];

export const ShiftCloseMode = {
  NORMAL: "NORMAL",
  BLIND: "BLIND",
} as const;
export type ShiftCloseMode =
  (typeof ShiftCloseMode)[keyof typeof ShiftCloseMode];

export const ShiftCloseResult = {
  BALANCED: "BALANCED",
  OVER: "OVER",
  SHORT: "SHORT",
  APPROVED: "APPROVED",
  NEEDS_APPROVAL: "NEEDS_APPROVAL",
} as const;
export type ShiftCloseResult =
  (typeof ShiftCloseResult)[keyof typeof ShiftCloseResult];

export const ShiftScheduleStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  STARTED: "STARTED",
  CANCELLED: "CANCELLED",
} as const;
export type ShiftScheduleStatus =
  (typeof ShiftScheduleStatus)[keyof typeof ShiftScheduleStatus];

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

export const TableShape = {
  RECTANGLE: "RECTANGLE",
  SQUARE: "SQUARE",
  CIRCLE: "CIRCLE",
  OVAL: "OVAL",
  CUSTOM: "CUSTOM",
} as const;
export type TableShape = (typeof TableShape)[keyof typeof TableShape];

/**
 * Default footprint (px on the POS floor plan, also written to Table.width/
 * height on create/shape-change) for each shape. Single source of truth for
 * both the API (tables.service.ts) and POS desktop (components/tables/config.ts)
 * so a table's size resets to a sane default whenever its shape changes.
 */
export const TABLE_SHAPE_DEFAULT_SIZE: Record<
  TableShape,
  { width: number; height: number }
> = {
  RECTANGLE: { width: 168, height: 120 },
  SQUARE: { width: 136, height: 136 },
  CIRCLE: { width: 148, height: 148 },
  OVAL: { width: 176, height: 112 },
  CUSTOM: { width: 160, height: 120 },
};

export const PurchaseOrderStatus = {
  PENDING: "PENDING",
  ORDERED: "ORDERED",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
} as const;
export type PurchaseOrderStatus =
  (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];
