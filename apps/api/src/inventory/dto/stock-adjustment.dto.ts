import { AdjustmentType } from '@repo/types';
import z from 'zod';

export const createStockAdjustmentSchema = z.object({
  branchId: z.string(),
  productId: z.string(),
  type: z.enum(AdjustmentType),
  quantity: z.number(),
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
  type: z.enum(AdjustmentType).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type StockAdjustmentHistoryQueryDto = z.infer<
  typeof stockAdjustmentHistoryQuerySchema
>;
