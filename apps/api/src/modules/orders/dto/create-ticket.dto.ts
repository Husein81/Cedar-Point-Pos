import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '@repo/types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  orderItemId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  station?: string;

  @ApiProperty({ enum: TicketStatus, required: false })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
