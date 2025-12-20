import z from 'zod';

export const createRefundDto = z.object({
  orderId: z.string(),
  reason: z.string().optional(),
  items: z.array(
    z.object({
      orderItemId: z.string(),
      quantity: z.number().positive(),
    }),
  ),
});
export type CreateRefundDto = z.infer<typeof createRefundDto>;

export const refundQueryDto = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  productId: z.string().optional(),
  orderId: z.string().optional(),
});
export type RefundQueryDto = z.infer<typeof refundQueryDto>;
