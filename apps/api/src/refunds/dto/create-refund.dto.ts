import z from 'zod';

/**
 * Order-linked refund item (existing flow)
 * References an existing order item by ID
 */
export const orderItemRefundSchema = z.object({
  orderItemId: z.string(),
  quantity: z.number().positive(),
});

/**
 * Manual refund item (new flow)
 * References a product directly without an order
 */
export const manualItemRefundSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
});

/**
 * Refund payment method for tracking how the refund was issued
 */
export const refundPaymentMethodSchema = z.enum([
  'CASH',
  'CARD',
  'ORIGINAL_METHOD', // Refund to original payment method
  'STORE_CREDIT',
]);

/**
 * Unified Refund DTO
 *
 * Supports two modes:
 * 1. Order-linked: orderId + items (existing flow)
 * 2. Manual: manualRefund=true + manualItems + branchId (new flow)
 *
 * The schema is designed to be backward-compatible:
 * - Existing clients sending { orderId, items } will continue to work
 * - New clients can send { manualRefund: true, manualItems, branchId, reason }
 *
 * Business validation (reason required for manual, etc.) is handled in service layer.
 */
export const createRefundDto = z.object({
  // ── ORDER-LINKED REFUND (existing flow) ──
  orderId: z.string().optional(),
  items: z.array(orderItemRefundSchema).optional(),

  // ── MANUAL REFUND (new flow) ──
  manualRefund: z.boolean().optional().default(false),
  manualItems: z.array(manualItemRefundSchema).optional(),

  // ── SHARED ──
  reason: z.string().optional(),
  branchId: z.string().optional(), // Required for manual refunds (inventory context)
  restockInventory: z.boolean().optional().default(true), // Whether to add stock back

  // ── EDGE CASE HANDLING ──
  paymentMethod: refundPaymentMethodSchema.optional(), // How to issue refund
  isDamaged: z.boolean().optional().default(false), // Damaged item - may skip restock
  managerOverride: z.boolean().optional().default(false), // Manager approved exception
  managerOverrideReason: z.string().optional(), // Why manager override was needed
  acknowledgedWarnings: z.array(z.string()).optional(), // Warning codes user acknowledged
});

/**
 * Validate refund request DTO (preview before submit)
 */
export const validateRefundDto = z.object({
  orderId: z.string().optional(),
  items: z.array(orderItemRefundSchema).optional(),
  manualRefund: z.boolean().optional().default(false),
  manualItems: z.array(manualItemRefundSchema).optional(),
  branchId: z.string().optional(),
});

export type CreateRefundDto = z.infer<typeof createRefundDto>;
export type ValidateRefundDto = z.infer<typeof validateRefundDto>;
export type OrderItemRefund = z.infer<typeof orderItemRefundSchema>;
export type ManualItemRefund = z.infer<typeof manualItemRefundSchema>;
export type RefundPaymentMethod = z.infer<typeof refundPaymentMethodSchema>;
