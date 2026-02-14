import { z } from 'zod';

/**
 * DTO for manual loyalty point adjustment.
 *
 * - Positive points = credit (add points).
 * - Negative points = debit (subtract points).
 * - Reason is mandatory per spec.
 */
export const manualAdjustmentDto = z.object({
  points: z
    .number()
    .int()
    .refine((v) => v !== 0, 'Points must be non-zero'),
  reason: z.string().min(1, 'Reason is required for manual adjustments'),
});

export type ManualAdjustmentDto = z.infer<typeof manualAdjustmentDto>;
