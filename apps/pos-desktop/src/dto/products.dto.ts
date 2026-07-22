import { ProductSchema } from "@repo/types";
import { z } from "zod";

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  deletedAt: true,
  modifiers: true,
});
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = ProductSchema.partial().omit({ id: true });
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;

/**
 * One row of a bulk CSV import. Frontend-side shape check only: `name` is
 * required and numeric columns must parse as numbers. Category/subcategory
 * existence is only knowable server-side, so those errors surface from the
 * backend's per-row result — not from this schema.
 */
export const BulkProductRowSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  price: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  categoryName: z.string().trim().optional(),
  subcategoryName: z.string().trim().optional(),
  stock: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isModifiable: z.boolean().optional(),
});
export type BulkProductRow = z.infer<typeof BulkProductRowSchema>;

export type BulkImportRowStatus = "created" | "skipped" | "error";

export type BulkImportRowResult = {
  row: number;
  status: BulkImportRowStatus;
  productId?: string;
  message?: string;
};

export type BulkImportResult = {
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  results: BulkImportRowResult[];
};

export const ProductWithRelationsSchema = ProductSchema.extend({
  category: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .nullable()
    .optional(),

  subcategory: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .nullable()
    .optional(),
});
export type ProductWithRelations = z.infer<typeof ProductWithRelationsSchema>;
