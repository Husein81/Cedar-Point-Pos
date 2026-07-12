import { UserRole } from '@repo/types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Query-string booleans arrive as the literal strings "true"/"false"; normalize
 * them explicitly (a naive cast would treat "false" as truthy). Anything else
 * becomes `undefined`, matching the shared `StaffQuerySchema` preprocess.
 */
const toQueryBoolean = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
};

/**
 * Filters for the paginated staff list. Mirrors the shared `StaffQuerySchema`.
 */
export class StaffQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @Transform(toQueryBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(toQueryBoolean)
  @IsBoolean()
  hasPosAccess?: boolean;
}

/**
 * Filters for the paginated activity-log query. Mirrors the shared
 * `StaffActivityQuerySchema`.
 */
export class StaffActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
