import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// ─── Offer DTOs ───

export class CreateOfferDto {
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Base price must be >= 0' })
  basePrice!: number;
}

export class UpdateOfferDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Base price must be >= 0' })
  basePrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── OfferGroup DTOs ───

export class CreateOfferGroupDto {
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Free items count must be >= 0' })
  freeItemsCount: number = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Max items count must be >= 1' })
  maxItemsCount: number = 1;
}

export class UpdateOfferGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Free items count must be >= 0' })
  freeItemsCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Max items count must be >= 1' })
  maxItemsCount?: number;
}

// ─── OfferGroupItem DTOs ───

export class CreateOfferGroupItemDto {
  @IsString()
  @MinLength(1, { message: 'Product ID is required' })
  productId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Extra price must be >= 0' })
  extraPrice: number = 0;
}

export class UpdateOfferGroupItemDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Extra price must be >= 0' })
  extraPrice!: number;
}

// ─── Price Preview / Validation DTO ───

export class OfferSelectionItemDto {
  @IsString()
  @MinLength(1, { message: 'Group ID is required' })
  groupId!: string;

  @IsString()
  @MinLength(1, { message: 'Product ID is required' })
  productId!: string;
}

export class PricePreviewDto {
  @IsString()
  @MinLength(1, { message: 'Offer ID is required' })
  offerId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one selection is required' })
  @ValidateNested({ each: true })
  @Type(() => OfferSelectionItemDto)
  selections!: OfferSelectionItemDto[];
}
