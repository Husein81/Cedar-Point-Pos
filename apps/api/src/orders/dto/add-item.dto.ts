import { z } from 'zod';

export const addItemDto = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
  modifiers: z.array(z.string()).optional(),
});
export type AddItemDto = z.infer<typeof addItemDto>;
