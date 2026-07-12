import { PaymentMethod } from '@repo/types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RefundItemDto {
  @IsString()
  @MinLength(1, { message: 'Order item ID is required' })
  orderItemId!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive({ message: 'Quantity must be greater than 0' })
  quantity!: number;
}

export class RefundPaymentDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsNumber()
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount!: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  exchangeRate?: number;
}

export class CreateRefundDto {
  @IsString()
  @MinLength(1, { message: 'Order ID is required' })
  orderId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item must be refunded' })
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items!: RefundItemDto[];

  // Method-level refund capture (optional for backward compat)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundPaymentDto)
  refundPayments?: RefundPaymentDto[];

  // Shift attribution (optional)
  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
