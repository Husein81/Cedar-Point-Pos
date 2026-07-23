import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

/** Max products accepted in a single bulk import request. */
export const BULK_IMPORT_MAX_ROWS = 1000;

/** Monetary columns are stored as Decimal(10,2); reject sub-cent float noise. */
const MONEY = { maxDecimalPlaces: 2 } as const;

/**
 * Single-product create/update DTOs. These replace the previous
 * `req.body as Prisma.ProductCreateInput` casts so the global ValidationPipe
 * actually validates product input (CLAUDE.md §4). Relations are accepted as
 * plain ids (`categoryId`, `subcategoryId`, `branchId`) and connected in the
 * controller.
 */
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(MONEY)
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(MONEY)
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageKey?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isModifiable?: boolean;
}

/**
 * Every field of CreateProductDto made optional — derived, not hand-copied, so
 * the two can never drift. A null/absent `branchId` still means "all branches"
 * (the controller disconnects on any falsy value).
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}

/**
 * One row of a bulk CSV import. Differs from CreateProductDto in that category
 * and subcategory arrive as human-readable names (resolved to ids server-side),
 * and an optional `stock` column sets initial inventory at the import's target
 * branch. Bulk-imported products are created tenant-wide (branchId: null); only
 * the inventory record is branch-scoped.
 */
export class BulkProductRowDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  subcategoryName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isModifiable?: boolean;
}

export class BulkCreateProductsDto {
  // Target branch for any per-row `stock` values. Optional: only required when a
  // row carries stock > 0. The products themselves are always tenant-wide.
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({
    type: [BulkProductRowDto],
    description: 'Parsed CSV rows to import',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_IMPORT_MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => BulkProductRowDto)
  rows!: BulkProductRowDto[];
}

export type BulkImportRowStatus = 'created' | 'skipped' | 'error';

export interface BulkImportRowResult {
  row: number;
  status: BulkImportRowStatus;
  productId?: string;
  message?: string;
}

export interface BulkImportResult {
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  results: BulkImportRowResult[];
}
