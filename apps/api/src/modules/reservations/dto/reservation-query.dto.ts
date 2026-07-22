import { ReservationSource, ReservationStatus, SortOrder } from '@repo/types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Filters for the paginated reservation list. All fields optional; strings from
 * the query string are coerced via class-transformer.
 */
export class ReservationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Free-text search across reservationNumber, customerName, customerPhone. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  tableId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsEnum(ReservationSource)
  source?: ReservationSource;

  @IsOptional()
  @IsUUID()
  createdById?: string;

  @IsOptional()
  @IsString()
  reservationNumber?: string;

  /** Inclusive lower bound on reservationDate (calendar day). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  /** Inclusive upper bound on reservationDate (calendar day). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;

  /** Column to sort by (whitelisted in the service). */
  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;
}
