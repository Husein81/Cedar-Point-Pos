import { z } from 'zod';

/**
 * DTO for loyalty point redemption at payment time.
 * Embedded inside the payment body as `loyalty.redeemPoints`.
 */
export const redeemPointsDto = z.object({
  redeemPoints: z
    .number()
    .int()
    .positive('Redeem points must be a positive integer'),
});

export type RedeemPointsDto = z.infer<typeof redeemPointsDto>;
