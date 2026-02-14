import { z } from 'zod';
import { LoyaltyTransactionType } from '@repo/types';

/**
 * Query params for loyalty transaction listing / reports.
 */
export const loyaltyTransactionQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(LoyaltyTransactionType).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  customerId: z.string().optional(),
});

export type LoyaltyTransactionQueryDto = z.infer<
  typeof loyaltyTransactionQueryDto
>;

/**
 * Query params for loyalty report endpoint.
 */
export const loyaltyReportQueryDto = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  branchId: z.string().optional(),
});

export type LoyaltyReportQueryDto = z.infer<typeof loyaltyReportQueryDto>;
