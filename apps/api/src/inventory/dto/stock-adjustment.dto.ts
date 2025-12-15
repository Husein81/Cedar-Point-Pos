import { z } from 'zod';
import { InventoryChangeType } from '@repo/types';

export const createStockAdjustmentSchema = z.object({
  branchId: z.string(),
  productId: z.string(),
  operation: z.enum(InventoryChangeType),
  quantity: z.number(), // For ADJUST_STOCK: positive to add, negative to remove. For SET_STOCK/MANUAL_ADJUST: absolute value
  reason: z.string(),
});
export type CreateStockAdjustmentDto = z.infer<
  typeof createStockAdjustmentSchema
>;

export const stockAdjustmentHistoryQuerySchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
  branchId: z.string().optional(),
  productId: z.string().optional(),
  changeType: z.enum(InventoryChangeType).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type StockAdjustmentHistoryQueryDto = z.infer<
  typeof stockAdjustmentHistoryQuerySchema
>;
