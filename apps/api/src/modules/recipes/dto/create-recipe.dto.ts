import { z } from 'zod';

export const createRecipeSchema = z.object({
  productId: z.string(),
  ingredientId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
});

export type CreateRecipeDto = z.infer<typeof createRecipeSchema>;
