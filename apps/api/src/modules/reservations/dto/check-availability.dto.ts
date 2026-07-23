import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { TIME_OF_DAY_REGEX } from './create-reservation.dto.js';

/**
 * Query for GET /reservations/availability. Given a branch + slot (date, time,
 * duration) and party size, the service returns which tables are free vs.
 * booked and the next open time. `excludeReservationId` lets an edit exclude
 * its own current booking from the overlap check.
 */
export class CheckAvailabilityDto {
  @IsUUID()
  branchId!: string;

  @Type(() => Date)
  @IsDate()
  reservationDate!: Date;

  @IsString()
  @Matches(TIME_OF_DAY_REGEX, {
    message: 'reservationTime must be in HH:mm 24-hour format',
  })
  reservationTime!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guestCount?: number;

  @IsOptional()
  @IsUUID()
  excludeReservationId?: string;
}
