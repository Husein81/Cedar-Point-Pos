import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateModifierDto {
  @IsString()
  name!: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[]; // Multi-product assignment
}

export class UpdateModifierDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[]; // Multi-product assignment
}
