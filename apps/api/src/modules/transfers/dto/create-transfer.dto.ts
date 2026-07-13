import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TransferItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class CreateTransferDto {
  @IsString()
  fromBranchId!: string;

  @IsString()
  toBranchId!: string;

  @ApiProperty({
    type: [TransferItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items!: TransferItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
