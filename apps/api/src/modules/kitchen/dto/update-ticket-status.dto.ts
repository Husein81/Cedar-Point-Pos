import { TicketStatus } from '@repo/types';
import { IsEnum } from 'class-validator';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status!: TicketStatus;
}
