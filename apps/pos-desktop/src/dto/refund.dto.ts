import { OrderStatus } from "@repo/types";

// =====================
// Refund Payment Methods
// =====================

export type RefundPaymentMethod =
  | "CASH"
  | "CARD"
  | "ORIGINAL_METHOD"
  | "STORE_CREDIT";

// =====================
// Warning System Types
// =====================

export type RefundWarningSeverity = "INFO" | "WARNING" | "MANAGER_REQUIRED";

export type RefundWarningCode =
  | "ORDER_OLD"
  | "HIGH_VALUE"
  | "MULTIPLE_REFUNDS"
  | "MANUAL_REFUND"
  | "OVER_REFUND"
  | "DIFFERENT_BRANCH"
  | "PRODUCT_NOT_FOUND";

export interface RefundWarning {
  code: RefundWarningCode;
  message: string;
  severity: RefundWarningSeverity;
}

export interface ValidateRefundResponse {
  valid: boolean;
  warnings: RefundWarning[];
  requiresManagerOverride: boolean;
  estimatedTotal: number;
}

// =====================
// Order-Linked Item DTO
// =====================

export interface CreateRefundItemDto {
  orderItemId: string;
  quantity: number;
}

// =====================
// Manual Item DTO
// =====================

export interface ManualRefundItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
}

// =====================
// Create Refund DTO (unified)
// =====================

export interface CreateRefundDto {
  // Order-linked refund (existing flow)
  orderId?: string;
  items?: CreateRefundItemDto[];

  // Manual refund (new flow)
  manualRefund?: boolean;
  manualItems?: ManualRefundItemDto[];

  // Shared
  reason?: string;
  branchId?: string;
  restockInventory?: boolean;

  // Edge case handling
  paymentMethod?: RefundPaymentMethod;
  isDamaged?: boolean;
  managerOverride?: boolean;
  managerOverrideReason?: string;
  acknowledgedWarnings?: string[];
}

// =====================
// Validate Refund DTO
// =====================

export interface ValidateRefundDto {
  orderId?: string;
  items?: CreateRefundItemDto[];
  manualRefund?: boolean;
  manualItems?: ManualRefundItemDto[];
  branchId?: string;
}

// =====================
// Barcode Lookup Types
// =====================

export interface LookupRefundableItem {
  orderItemId: string;
  orderId: string;
  orderNumber: string | null;
  orderDate: string | null;
  branchId: string | null;
  customerName: string | null;
  quantity: number;
  refundedQuantity: number;
  refundableQuantity: number;
  unitPrice: number;
}

export interface LookupRefundableResult {
  found: boolean;
  product: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    imageUrl: string | null;
    price: number;
  } | null;
  refundableItems: LookupRefundableItem[];
  canManualRefund: boolean;
  message: string;
}

// =====================
// Existing Types (unchanged)
// =====================

export interface RefundableItem {
  orderItemId: string;
  productId: string;
  productName: string;
  productSku: string | null;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  refundedQuantity: number;
  refundableQuantity: number;
}

export interface RefundableInfo {
  orderId: string;
  orderNumber: string | null;
  orderStatus: string;
  orderTotal: number;
  canRefund: boolean;
  isFullyRefunded: boolean;
  totalRefundable: number;
  items: RefundableItem[];
}

export interface RefundFilters {
  from?: string;
  to?: string;
  productId?: string;
  orderId?: string;
}

export interface RefundableOrderSummary {
  id: string;
  orderNumber: string | null;
  createdAt: string;
  completedAt: string | null;
  total: number;
  subtotal: number;
  status: OrderStatus;
  paymentMethod: string | null;
  customerName: string | null;
  itemCount: number;
  hasRefunds: boolean;
}

export interface RefundableOrdersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
}

export interface RefundHistory {
  id: string;
  refundedAt: string;
  totalAmount: number;
  reason: string | null;
  items: Array<{
    productName: string;
    quantity: number;
    subtotal: number;
  }>;
}
