import z from 'zod';

export const createModifierDto = z.object({
  name: z.string(),
  price: z.number(),
  productId: z.string().optional(),
});
export type CreateModifierDto = z.infer<typeof createModifierDto>;

export const updateModifierDto = z.object({
  name: z.string().optional(),
  price: z.number().optional(),
  productId: z.string().optional(),
});
export type UpdateModifierDto = z.infer<typeof updateModifierDto>;
