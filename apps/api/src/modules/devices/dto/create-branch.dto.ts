import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Creates a branch for a tenant. SYSTEM_ADMIN-only — see BranchesController. */
export class CreateBranchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}
