import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class SplitOrderItemDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;
}

export class SplitOrderDto {
  @ApiProperty({ type: [SplitOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitOrderItemDto)
  items!: SplitOrderItemDto[];
}
