import { IsInt, NotEquals, IsString, MinLength } from 'class-validator';

/**
 * DTO for manual loyalty point adjustment.
 *
 * - Positive points = credit (add points).
 * - Negative points = debit (subtract points).
 * - Reason is mandatory per spec.
 */
export class ManualAdjustmentDto {
  @IsInt()
  @NotEquals(0, { message: 'Points must be non-zero' })
  points!: number;

  @IsString()
  @MinLength(1, { message: 'Reason is required for manual adjustments' })
  reason!: string;
}
