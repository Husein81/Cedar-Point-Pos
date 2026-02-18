import { OrderStatus } from "@repo/types";
import { z } from "zod";

const CreateRefundItemSchema = z.object({
  orderItemId: z.string(),
  quantity: z.number().positive(),
});
export type CreateRefundItemDto = z.infer<typeof CreateRefundItemSchema>;

const CreateRefundSchema = z.object({
  orderId: z.string(),
  reason: z.string().optional(),
  items: z.array(CreateRefundItemSchema),
});
export type CreateRefundDto = z.infer<typeof CreateRefundSchema>;

const RefundableItemSchema = z.object({
  orderItemId: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string().nullable(),
  productImageUrl: z.string().nullable(),
  quantity: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  refundedQuantity: z.number().nonnegative(),
  refundableQuantity: z.number().nonnegative(),
});
export type RefundableItem = z.infer<typeof RefundableItemSchema>;

const RefundableInfoSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string().nullable(),
  orderStatus: z.string(),
  orderTotal: z.number().nonnegative(),
  canRefund: z.boolean(),
  isFullyRefunded: z.boolean(),
  totalRefundable: z.number().nonnegative(),
  items: z.array(RefundableItemSchema),
});
export type RefundableInfo = z.infer<typeof RefundableInfoSchema>;

const RefundFiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  productId: z.string().optional(),
  orderId: z.string().optional(),
});
export type RefundFilters = z.infer<typeof RefundFiltersSchema>;

const RefundableOrderSummarySchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  total: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  status: z.custom<OrderStatus>(),
  paymentMethod: z.string().nullable(),
  customerName: z.string().nullable(),
  itemCount: z.number().nonnegative(),
  hasRefunds: z.boolean(),
});
export type RefundableOrderSummary = z.infer<
  typeof RefundableOrderSummarySchema
>;

const RefundableOrdersFiltersSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  status: z.custom<OrderStatus>().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  branchId: z.string().optional(),
});
export type RefundableOrdersFilters = z.infer<
  typeof RefundableOrdersFiltersSchema
>;

const RefundHistoryItemSchema = z.object({
  productName: z.string(),
  quantity: z.number().positive(),
  subtotal: z.number().nonnegative(),
});

const RefundHistorySchema = z.object({
  id: z.string(),
  refundedAt: z.string(),
  totalAmount: z.number().nonnegative(),
  reason: z.string().nullable(),
  isPartialRefund: z.boolean().optional(),
  loyaltyPointsRestored: z.number().optional(),
  loyaltyPointsReversed: z.number().optional(),
  items: z.array(RefundHistoryItemSchema),
});
export type RefundHistory = z.infer<typeof RefundHistorySchema>;
