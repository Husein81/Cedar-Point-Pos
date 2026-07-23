import { ApiProperty } from '@nestjs/swagger';
import { OrderType, PaymentMethod } from '@repo/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderDiscountDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'] })
  @IsEnum(['PERCENTAGE', 'FIXED'])
  type!: 'PERCENTAGE' | 'FIXED';
}

export class CreateOrderItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiProperty({ type: CreateOrderDiscountDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderDiscountDto)
  discount?: CreateOrderDiscountDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifiers?: string[];
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  branchId!: string;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  type!: OrderType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Extra customers sharing this order (excludes the primary).',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalCustomerIds?: string[];

  @ApiProperty({ type: [CreateOrderItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  includeVAT?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;
}

export class PaymentDto {
  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  exchangeRate?: number;
}

export class LoyaltyRedemptionDto {
  @ApiProperty()
  @IsNumber()
  @IsInt()
  @Min(1)
  redeemPoints!: number;
}

export class ProcessPaymentDto {
  @ApiProperty({ type: [PaymentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments?: PaymentDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ enum: PaymentMethod, required: false })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @ApiProperty({ type: LoyaltyRedemptionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LoyaltyRedemptionDto)
  loyalty?: LoyaltyRedemptionDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
