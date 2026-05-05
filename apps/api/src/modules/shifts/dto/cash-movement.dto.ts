import { z } from 'zod';
import { CashMovementType } from '@repo/types';

export const createCashMovementDto = z.object({
  type: z.enum([CashMovementType.CASH_IN, CashMovementType.CASH_OUT]),
  amount: z.number().positive('Amount must be greater than 0'),
  reason: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export type CreateCashMovementDto = z.infer<typeof createCashMovementDto>;
