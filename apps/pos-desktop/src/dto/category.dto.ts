import { CategorySchema } from "@repo/types";
import { z } from "zod";

const CreateCategorySchema = z.object({
  name: z.string(),
  code: z.string().optional(),
  description: z.string().optional(),
  colorId: z.string().optional(),
});
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;

const UpdateCategorySchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  colorId: z.string().optional(),
});
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;

const CategoryWithSubcategoriesSchema = CategorySchema.extend({
  subcategories: z
    .array(
      z.object({
        id: z.string(),
        categoryId: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        isDeleted: z.boolean(),
      })
    )
    .nullable()
    .optional(),
});
export type CategoryWithSubcategories = z.infer<
  typeof CategoryWithSubcategoriesSchema
>;

const CreateSubcategorySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});
export type CreateSubcategoryDto = z.infer<typeof CreateSubcategorySchema>;

const UpdateSubcategorySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});
export type UpdateSubcategoryDto = z.infer<typeof UpdateSubcategorySchema>;
