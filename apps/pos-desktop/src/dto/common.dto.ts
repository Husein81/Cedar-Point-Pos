import { z } from "zod";

// Shared response fragments reused across list/detail DTOs (supplier, purchase
// order, inventory, ...). Extend from these instead of redeclaring the shape.

export const BranchSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type BranchSummary = z.infer<typeof BranchSummarySchema>;

export const ProductSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
});
export type ProductSummary = z.infer<typeof ProductSummarySchema>;
