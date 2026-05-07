import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@repo/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  orderItemId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  station?: string;

  @ApiProperty({ enum: OrderStatus, required: false })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
