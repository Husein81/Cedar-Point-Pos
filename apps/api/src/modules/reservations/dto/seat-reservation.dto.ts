import { IsOptional, IsUUID } from 'class-validator';

/**
 * Payload for POST /reservations/:id/seat. The table normally comes from the
 * reservation itself; `tableId` here overrides/assigns it at seating time when
 * the reservation had none. `deviceId`/`shiftId` bind the created dine-in order
 * to the terminal context, matching CreateOrderDto.
 */
export class SeatReservationDto {
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsUUID()
  shiftId?: string;
}
