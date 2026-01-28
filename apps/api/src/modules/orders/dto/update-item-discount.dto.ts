import { z } from 'zod';

export const updateItemDiscountDto = z.object({
  value: z.number().min(0),
  type: z.enum(['PERCENTAGE', 'FIXED']),
});

export type UpdateItemDiscountDto = z.infer<typeof updateItemDiscountDto>;
