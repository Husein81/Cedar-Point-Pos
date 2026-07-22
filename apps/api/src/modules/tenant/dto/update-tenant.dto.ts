import { BusinessType } from '@repo/types';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @IsOptional()
  @IsString()
  baseCurrencyCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
