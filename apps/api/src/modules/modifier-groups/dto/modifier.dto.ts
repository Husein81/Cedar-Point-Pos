import { z } from 'zod';

export const createModifierDto = z.object({
  name: z.string(),
  price: z.number(),
  productIds: z.array(z.string()).optional(), // ✅ Multi-product assignment
});
export type CreateModifierDto = z.infer<typeof createModifierDto>;

export const updateModifierDto = z.object({
  name: z.string().optional(),
  price: z.number().optional(),
  productIds: z.array(z.string()).optional(), // ✅ Multi-product assignment
});
export type UpdateModifierDto = z.infer<typeof updateModifierDto>;
