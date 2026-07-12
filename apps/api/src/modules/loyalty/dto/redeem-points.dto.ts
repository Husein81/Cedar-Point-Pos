import { IsInt, IsPositive } from 'class-validator';

/**
 * DTO for loyalty point redemption at payment time.
 * Embedded inside the payment body as `loyalty.redeemPoints`.
 */
export class RedeemPointsDto {
  @IsInt()
  @IsPositive({ message: 'Redeem points must be a positive integer' })
  redeemPoints!: number;
}
