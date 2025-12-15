import { z } from 'zod';

export const updateRecipeDto = z.object({
  productId: z.string().optional(),
  ingredientId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
});
export type UpdateRecipeDto = z.infer<typeof updateRecipeDto>;
