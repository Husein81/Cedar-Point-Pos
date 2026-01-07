import { InventoryChangeType } from '@repo/types';
import { z } from 'zod';

export const inventoryQuerySchema = z.object({
  branchId: z.string().optional(),
  productId: z.string().optional(),
  userId: z.string().optional(),
  changeType: z.enum(InventoryChangeType).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;

export const createInventoryHistorySchema = z.object({
  tenantId: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  changeType: z.enum(InventoryChangeType).optional(),
  beforeStock: z.number().optional(),
  afterStock: z.number().optional(),
  adjustment: z.number().optional(),
  beforeMinStock: z.number().optional(),
  afterMinStock: z.number().optional(),
  reason: z.string().optional(),
  createdAt: z.date().default(new Date()).optional(),
});
export type CreateInventoryHistoryDto = z.infer<
  typeof createInventoryHistorySchema
>;

export const ReferenceTypeSchema = z.enum([
  'ORDER',
  'REFUND',
  'TRANSFER',
  'ADJUSTMENT',
]);
export type ReferenceType = z.infer<typeof ReferenceTypeSchema>;

export const InventoryTransactionInputSchema = z
  .object({
    tenantId: z.string().min(1, 'tenantId is required'),
    branchId: z.string().min(1, 'branchId is required'),
    productId: z.string().min(1, 'productId is required'),
    userId: z.string().min(1, 'userId is required'),
    changeType: z.enum(InventoryChangeType),
    quantity: z.number().positive('quantity must be > 0'),
    reason: z.string().min(1).optional(),
    referenceId: z.string().min(1).optional(),
    referenceType: ReferenceTypeSchema.optional(),
    allowNegativeStock: z.boolean().optional(),
    minStock: z.number().nonnegative('minStock cannot be negative').optional(),
    afterMinStock: z
      .number()
      .nonnegative('afterMinStock cannot be negative')
      .optional(),
  })
  .superRefine((val, ctx) => {
    // If referenceType is provided, referenceId should exist (and vice versa).
    const hasRefId = !!val.referenceId;
    const hasRefType = !!val.referenceType;

    if (hasRefId !== hasRefType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'referenceId and referenceType must be provided together',
        path: hasRefId ? ['referenceType'] : ['referenceId'],
      });
    }

    // Enforce minStock presence for SET_MIN_STOCK
    if (val.changeType === 'SET_MIN_STOCK' && val.minStock === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minStock is required when changeType is SET_MIN_STOCK',
        path: ['minStock'],
      });
    }
  });

export type InventoryTransactionInput = z.infer<
  typeof InventoryTransactionInputSchema
>;

/* -------------------------------------------------------------------------- */
/*                           TransactionResult Schema                           */
/* -------------------------------------------------------------------------- */

export const TransactionResultSchema = z.object({
  inventoryId: z.string().min(1),
  beforeStock: z.number(),
  afterStock: z.number(),
  afterMinStock: z.number().optional(),
  adjustment: z.number(),
  historyId: z.string().min(1),
});

export type TransactionResult = z.infer<typeof TransactionResultSchema>;
