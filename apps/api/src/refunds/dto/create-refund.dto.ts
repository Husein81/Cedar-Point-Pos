import z from 'zod';

export const createRefundDto = z.object({
  orderId: z.string(),
  productId: z.string(),
  quantity: z.number().positive(),
  reason: z.string().optional(),
  items: z.array(
    z.object({
      orderItemId: z.string(),
      quantity: z.number().positive(),
    }),
  ),
});
export type CreateRefundDto = z.infer<typeof createRefundDto>;
