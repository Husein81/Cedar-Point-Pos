import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*                               ENUMS / TYPES                                */
/* -------------------------------------------------------------------------- */

export const AdjustmentTypeSchema = z.enum([
  "STOCK_IN",
  "STOCK_OUT",
  "SET_STOCK",
]);

export type AdjustmentType = z.infer<typeof AdjustmentTypeSchema>;

/* -------------------------------------------------------------------------- */
/*                             STOCK ADJUSTMENT                                */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                          INVENTORY WITH RELATIONS                           */
/* -------------------------------------------------------------------------- */

export const InventoryProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
});

export const InventoryBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
});


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
  product: InventoryProductSchema,
  branch: InventoryBranchSchema,
});

export type InventoryWithProduct = z.infer<typeof InventoryWithProductSchema>;

/* -------------------------------------------------------------------------- */
/*                        ADJUSTMENT HISTORY QUERY                              */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                         PAGINATED INVENTORY RESPONSE                        */
/* -------------------------------------------------------------------------- */

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const PaginatedInventoryResponseSchema = z.object({
  data: z.array(InventoryWithProductSchema),
  pagination: PaginationMetaSchema,
});

export type PaginatedInventoryResponse = z.infer<
  typeof PaginatedInventoryResponseSchema
>;
