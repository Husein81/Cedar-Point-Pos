import z from 'zod';
import { PaymentMethod } from '@repo/types';

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

  // Method-level refund capture (optional for backward compat)
  refundPayments: z
    .array(
      z.object({
        method: z.enum(PaymentMethod),
        amount: z.number().positive('Amount must be greater than 0'),
        currencyCode: z.string().optional(),
        exchangeRate: z.number().positive().optional(),
      }),
    )
    .optional(),

  // Shift attribution (optional)
  shiftId: z.string().optional(),
  deviceId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export type CreateRefundDto = z.infer<typeof createRefundDto>;
