import { LoyaltyEnrollmentMode } from '@repo/types';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO for creating or updating a tenant's loyalty program.
 *
 * Server-side validation rules (enforced in service when isEnabled = true):
 *   - earnPointsPerCurrency > 0
 *   - redeemPointsStep > 0
 *   - redeemCurrencyPerStep > 0
 *   - 0 <= maxRedeemPercent <= 100
 */
export class UpdateLoyaltyProgramDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsEnum(LoyaltyEnrollmentMode)
  enrollmentMode?: LoyaltyEnrollmentMode;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  earnPointsPerCurrency?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  redeemPointsStep?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  redeemCurrencyPerStep?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minRedeemPoints?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxRedeemPercent?: number;

  @IsOptional()
  @IsBoolean()
  allowNoCustomerAccrual?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  pointsExpirationDays?: number | null;
}
