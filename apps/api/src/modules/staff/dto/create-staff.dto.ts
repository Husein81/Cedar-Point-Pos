import { UserRole } from '@repo/types';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * Create-staff body. Mirrors the shared `CreateStaffSchema` in `@repo/types`
 * (kept in sync manually; the POS frontend still validates against that shared
 * schema). A POS PIN is a 4-6 digit numeric code, hashed server-side.
 */
export class CreateStaffDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  // Optional PIN so a staff member is POS-ready on creation. Omit it to create
  // the account first and set the PIN later via PATCH /staff/:id/set-pin.
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  hasPosAccess: boolean = true;
}
