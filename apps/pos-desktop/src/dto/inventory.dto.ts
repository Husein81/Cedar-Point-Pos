import type { PaginationResponse } from "@repo/types";
import { z } from "zod";
import { BranchSummarySchema, ProductSummarySchema } from "./common.dto";

export const AdjustmentTypeSchema = z.enum([
  "STOCK_IN",
  "STOCK_OUT",
  "SET_STOCK",
]);

export type AdjustmentType = z.infer<typeof AdjustmentTypeSchema>;

export const StockAdjustmentSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  productId: z.string().min(1, "Product ID is required"),
  adjustmentType: AdjustmentTypeSchema,
  quantity: z.number().positive("Quantity must be greater than 0"),
  minStock: z
    .number()
    .nonnegative("Minimum stock cannot be negative")
    .optional(),
  reason: z.string().min(1, "Reason is required"),
});

export type StockAdjustmentDto = z.infer<typeof StockAdjustmentSchema>;

export const InventoryBaseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  branchId: z.string(),
  productId: z.string(),
  stock: z.number(),
  minStock: z.number(),
  lastAdjusted: z.string().or(z.date()),
});

export const InventoryWithProductSchema = InventoryBaseSchema.extend({
  product: ProductSummarySchema,
  branch: BranchSummarySchema,
});

export type InventoryWithProduct = z.infer<typeof InventoryWithProductSchema>;

export const AdjustmentHistoryQuerySchema = z.object({
  page: z.preprocess(Number, z.number().int().positive()).optional(),
  limit: z.preprocess(Number, z.number().int().positive()).optional(),
  branchId: z.string().optional(),
  productId: z.string().optional(),
  changeType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type AdjustmentHistoryQuery = z.infer<
  typeof AdjustmentHistoryQuerySchema
>;

export type PaginatedInventoryResponse =
  PaginationResponse<InventoryWithProduct>;
