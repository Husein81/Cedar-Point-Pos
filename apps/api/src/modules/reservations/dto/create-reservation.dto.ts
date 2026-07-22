import { ReservationSource } from '@repo/types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** "HH:mm" 24-hour clock, 00:00–23:59. */
export const TIME_OF_DAY_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateReservationDto {
  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  customerPhone!: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsUUID()
  tableId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  guestCount!: number;

  // Calendar day of the booking. reservationTime carries the wall-clock time;
  // the service composes them into the reservationAt instant.
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
  @IsEnum(ReservationSource)
  source?: ReservationSource;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
