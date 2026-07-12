import { LoyaltyTransactionType } from '@repo/types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Query params for loyalty transaction listing / reports.
 */
export class LoyaltyTransactionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsEnum(LoyaltyTransactionType)
  type?: LoyaltyTransactionType;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @IsString()
  customerId?: string;
}

/**
 * Query params for loyalty report endpoint.
 */
export class LoyaltyReportQueryDto {
  @Type(() => Date)
  @IsDate()
  from!: Date;

  @Type(() => Date)
  @IsDate()
  to!: Date;

  @IsOptional()
  @IsString()
  branchId?: string;
}
