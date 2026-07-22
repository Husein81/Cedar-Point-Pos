import { BusinessType } from '@repo/types';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Uppercase letters/digits/hyphens, 3-20 chars — typed at login, so kept short and easy to read aloud. */
export const TENANT_CODE_REGEX = /^[A-Z0-9-]{3,20}$/;

export class CreateTenantDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(BusinessType)
  businessType!: BusinessType;

  // Optional on create so a tenant can still be provisioned before its code is
  // decided; without one, tenant-scoped username/password login is unavailable
  // until an admin sets it via PATCH.
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(TENANT_CODE_REGEX, {
    message: 'code must be 3-20 uppercase letters, digits, or hyphens',
  })
  code?: string;
}
