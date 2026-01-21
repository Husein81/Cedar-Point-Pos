import { ProductSchema } from "@repo/types";
import { z } from "zod";

/**
 * CREATE
 */
export const CreateProductSchema = ProductSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  isDeleted: true,
});
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

/**
 * UPDATE
 */
export const UpdateProductSchema = ProductSchema.partial().omit({ id: true });
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;

/**
 * BASE PRODUCT (example)
 * Adjust fields if your Product model differs
 */

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
