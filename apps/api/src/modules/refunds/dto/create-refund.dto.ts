import z from 'zod';

export const createRefundDto = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  reason: z.string().optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1, 'Order item ID is required'),
        quantity: z
          .number()
          .positive('Quantity must be greater than 0')
          .finite('Quantity must be a valid number'),
      }),
    )
    .min(1, 'At least one item must be refunded'),
});

export type CreateRefundDto = z.infer<typeof createRefundDto>;
