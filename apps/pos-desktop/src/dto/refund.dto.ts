import { OrderStatus } from "@repo/types";

// DTO Types
export interface CreateRefundItemDto {
  orderItemId: string;
  quantity: number;
}

export interface CreateRefundDto {
  orderId: string;
  reason?: string;
  items: CreateRefundItemDto[];
}

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
  isPartialRefund?: boolean;
  items: Array<{
    productName: string;
    quantity: number;
    subtotal: number;
  }>;
}
