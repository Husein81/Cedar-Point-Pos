import { z } from 'zod';
import {
  OrderType,
  OrderStatus,
  PaymentMethod,
  InventoryChangeType,
} from '@repo/types';

/**
 * Expanded Report Query Schema
 * Validates query params for all report endpoints with:
 * - Date range filtering (from/to)
 * - Enum filters (orderType, paymentMethod, status, changeType)
 * - User/branch filtering
 * - Search, sorting, and pagination
 */
export const reportQuerySchema = z
  .object({
    // Date range (required for most report endpoints)
    from: z.coerce.date(),
    to: z.coerce.date(),

    // Optional filters
    branchId: z.string().cuid().optional(),
    userId: z.string().cuid().optional(),
    shiftId: z.string().cuid().optional(),

    // Enum filters
    orderType: z
      .enum([
        OrderType.DINE_IN,
        OrderType.TAKEAWAY,
        OrderType.DELIVERY,
        OrderType.RETAIL,
      ])
      .optional(),
    paymentMethod: z
      .enum([
        PaymentMethod.CASH,
        PaymentMethod.CARD,
        PaymentMethod.CREDIT,
        PaymentMethod.VOUCHER,
        PaymentMethod.ONLINE,
      ])
      .optional(),
    status: z
      .enum([
        OrderStatus.DRAFT,
        OrderStatus.ON_HOLD,
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.IN_PROGRESS,
        OrderStatus.SENT_TO_KITCHEN,
        OrderStatus.READY,
        OrderStatus.PAID,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ])
      .optional(),
    changeType: z
      .enum([
        InventoryChangeType.SET_STOCK,
        InventoryChangeType.ADJUST_STOCK,
        InventoryChangeType.SET_MIN_STOCK,
        InventoryChangeType.ORDER_DEDUCTION,
        InventoryChangeType.SALE,
        InventoryChangeType.REFUND,
        InventoryChangeType.MANUAL_ADJUST,
        InventoryChangeType.TRANSFER_OUT,
        InventoryChangeType.TRANSFER_IN,
      ])
      .optional(),

    // Product filters
    categoryId: z.string().cuid().optional(),

    // Search (interpreted differently per endpoint)
    search: z.string().max(100).optional(),

    // Sorting (validated per-endpoint in controller/service)
    sortBy: z.string().max(50).optional(),
    sortDir: z.enum(['asc', 'desc']).optional().default('desc'),

    // Pagination
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(200).optional().default(25),

    // Limit for dashboard-style endpoints (top products, etc.)
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .refine((data) => data.from <= data.to, {
    message: 'from date must be before or equal to to date',
    path: ['from'],
  });

export type ReportQueryDto = z.infer<typeof reportQuerySchema>;

/**
 * Allowed sort fields per endpoint type
 * Used by service methods to validate sortBy parameter
 */
export const ALLOWED_SORT_FIELDS = {
  salesOrders: [
    'createdAt',
    'completedAt',
    'total',
    'subtotal',
    'discount',
    'orderNumber',
  ],
  paymentTransactions: ['paidAt', 'amount', 'method'],
  inventoryMovements: ['createdAt', 'changeType', 'adjustment'],
  topProducts: ['revenue', 'qtySold', 'productName'],
  loyaltyTransactions: ['createdAt', 'type', 'points', 'direction'],
} as const;

/**
 * Paginated response meta type
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
