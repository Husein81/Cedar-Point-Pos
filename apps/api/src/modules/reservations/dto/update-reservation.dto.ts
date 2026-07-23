import { ReservationSource, ReservationStatus } from '@repo/types';
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
import { TIME_OF_DAY_REGEX } from './create-reservation.dto.js';

/**
 * Editable reservation fields. `status` transitions are still validated by the
 * service's state machine — prefer the lifecycle endpoints (arrive/seat/etc.)
 * for status moves that carry side effects (order/table). A plain PATCH status
 * change is only honored for side-effect-free transitions.
 */
export class UpdateReservationDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  customerPhone?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guestCount?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reservationDate?: Date;

  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY_REGEX, {
    message: 'reservationTime must be in HH:mm 24-hour format',
  })
  reservationTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @IsOptional()
  @IsEnum(ReservationSource)
  source?: ReservationSource;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
