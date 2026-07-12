import { UserRole } from '@repo/types';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MinLength,
} from 'class-validator';

/**
 * Update-staff body. Mirrors the shared `UpdateStaffSchema` in `@repo/types`.
 * All identity fields are optional; security flags (isActive, hasPosAccess,
 * PIN, password) are changed through dedicated endpoints, not here. Nullable
 * fields accept `null` to clear the stored value.
 */
export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string | null;

  @IsOptional()
  @IsUrl()
  avatar?: string | null;
}
