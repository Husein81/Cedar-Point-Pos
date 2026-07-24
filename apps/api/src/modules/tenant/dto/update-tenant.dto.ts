import { BusinessType } from '@repo/types';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
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

  // Nullable so the client can clear the logo. `@ValidateIf` skips the URL
  // check when the value is explicitly null.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl()
  logoUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
