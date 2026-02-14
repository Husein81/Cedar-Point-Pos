import { z } from 'zod';
import { LoyaltyEnrollmentMode } from '@repo/types';

/**
 * DTO for creating or updating a tenant's loyalty program.
 *
 * Server-side validation rules (enforced in service when isEnabled = true):
 *   - earnPointsPerCurrency > 0
 *   - redeemPointsStep > 0
 *   - redeemCurrencyPerStep > 0
 *   - 0 <= maxRedeemPercent <= 100
 */
export const updateLoyaltyProgramDto = z.object({
  isEnabled: z.boolean().optional(),
  enrollmentMode: z.enum(LoyaltyEnrollmentMode).optional(),
  earnPointsPerCurrency: z.number().positive().optional(),
  redeemPointsStep: z.number().int().positive().optional(),
  redeemCurrencyPerStep: z.number().positive().optional(),
  minRedeemPoints: z.number().int().min(0).optional(),
  maxRedeemPercent: z.number().min(0).max(100).optional(),
  allowNoCustomerAccrual: z.boolean().optional(),
  pointsExpirationDays: z.number().int().positive().nullable().optional(),
});

export type UpdateLoyaltyProgramDto = z.infer<typeof updateLoyaltyProgramDto>;
