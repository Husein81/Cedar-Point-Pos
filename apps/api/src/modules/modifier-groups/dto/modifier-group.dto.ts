import { ModifierType } from '@repo/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateModifierGroupDto {
  @IsString()
  name!: string;

  @IsEnum(ModifierType)
  type!: ModifierType;
}

export class UpdateModifierGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ModifierType)
  type?: ModifierType;
}
