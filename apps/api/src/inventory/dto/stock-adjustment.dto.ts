import { z } from 'zod';
import { InventoryChangeType } from '@repo/types';

export const adjustmentTypeEnum = z.enum([
  'STOCK_IN',
  'STOCK_OUT',
  'SET_STOCK',
]);
export type AdjustmentType = z.infer<typeof adjustmentTypeEnum>;

export const createStockAdjustmentSchema = z.object({
  branchId: z.string(),
  productId: z.string(),
  adjustmentType: adjustmentTypeEnum,
  quantity: z.number().positive(), // Always positive, adjustmentType determines if adding or removing
  reason: z.string(),
  minStock: z.number().optional(), // Optional minimum stock threshold
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

export interface StockDeductionItem {
  productId: string;
  productName: string;
  quantity: number;
  orderItemId?: string;
}

export interface StockValidationResult {
  isValid: boolean;
  insufficientStock: Array<{
    productId: string;
    productName: string;
    ingredientId?: string;
    ingredientName?: string;
    required: number;
    available: number;
  }>;
}

// Stock warning info returned after deduction (does NOT block the order)
export interface StockWarningInfo {
  productId: string;
  productName: string;
  ingredientId?: string;
  ingredientName?: string;
  quantityDeducted: number;
  stockBefore: number;
  stockAfter: number;
}
