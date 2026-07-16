import { ProductSchema } from "@repo/types";
import { z } from "zod";

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  deletedAt: true,
});
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = ProductSchema.partial().omit({ id: true });
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;

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
