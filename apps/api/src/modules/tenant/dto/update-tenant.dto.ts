import { BusinessType } from '@repo/types';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TENANT_CODE_REGEX } from './create-tenant.dto.js';

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
  @MaxLength(20)
  @Matches(TENANT_CODE_REGEX, {
    message: 'code must be 3-20 uppercase letters, digits, or hyphens',
  })
  code?: string;

  @IsOptional()
  @IsString()
  baseCurrencyCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
