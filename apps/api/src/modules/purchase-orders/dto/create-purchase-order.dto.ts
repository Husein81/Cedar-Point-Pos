import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PurchaseOrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  @MinLength(1, { message: 'Product ID is required' })
  productId!: string;

  @IsNumber()
  @IsPositive({ message: 'Quantity must be positive' })
  quantity!: number;

  @IsNumber()
  @Min(0, { message: 'Unit cost cannot be negative' })
  unitCost!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @IsString()
  @MinLength(1, { message: 'Supplier ID is required' })
  supplierId!: string;

  @IsString()
  @MinLength(1, { message: 'Branch ID is required' })
  branchId!: string;

  @ApiProperty({
    type: [PurchaseOrderItemDto],
    description: 'List of items in the purchase order',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;
}
