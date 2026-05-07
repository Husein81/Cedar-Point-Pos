import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@repo/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

export class SplitPaymentItemDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}

export class SplitPaymentDto {
  @ApiProperty({ type: [SplitPaymentItemDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => SplitPaymentItemDto)
  payments!: SplitPaymentItemDto[];
}
