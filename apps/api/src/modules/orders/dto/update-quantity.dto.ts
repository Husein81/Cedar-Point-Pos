import { z } from 'zod';

export const updateQuantityDto = z.object({
  quantity: z.number().positive(),
});
export type UpdateQuantityDto = z.infer<typeof updateQuantityDto>;
