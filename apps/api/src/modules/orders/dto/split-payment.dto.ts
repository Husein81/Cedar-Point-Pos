import { PaymentMethod } from '@repo/types';
import { z } from 'zod';

export const splitPaymentItemDto = z.object({
  amount: z.number().min(0.01),
  method: z.enum(PaymentMethod),
});
export type SplitPaymentItemDto = z.infer<typeof splitPaymentItemDto>;

export const splitPaymentDto = z.object({
  payments: z.array(splitPaymentItemDto).min(2), // At least 2 splits
});
export type SplitPaymentDto = z.infer<typeof splitPaymentDto>;
