import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsPositive,
} from 'class-validator';

type DiscountType = 'PERCENTAGE' | 'FIXED';

export class AddItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  discount?: {
    value: number;
    type: DiscountType;
  };

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifiers?: string[];
}
