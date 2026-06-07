import { PurchaseOrderStatus } from '@repo/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePurchaseOrderDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @IsString()
  @IsOptional()
  orderNumber?: string;
}
