import { ShiftScheduleStatus } from '@repo/types';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  IsAfterField,
  IsSameCalendarDay,
} from '../../common/validators/date-field.validators.js';

// ── Create Schedule ──────────────────────────────────────────────────────────
export class CreateScheduleDto {
  @IsString()
  @MinLength(1, { message: 'Branch ID is required' })
  branchId!: string;

  @IsString()
  @MinLength(1, { message: 'User ID is required' })
  userId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  deviceId?: string;

  @Type(() => Date)
  @IsDate()
  @IsSameCalendarDay('startTime', {
    message: 'Schedule date must match the calendar day of startTime',
  })
  date!: Date;

  @Type(() => Date)
  @IsDate()
  startTime!: Date;

  @Type(() => Date)
  @IsDate()
  @IsAfterField('startTime', { message: 'End time must be after start time' })
  endTime!: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// ── Update Schedule ──────────────────────────────────────────────────────────
export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  userId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  deviceId?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  // Recurring patterns only: the weekly days to update.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one day of week' })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  // Recurring bounds; `null` explicitly clears (ongoing), absent leaves unchanged.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @IsAfterField('startTime', { message: 'End time must be after start time' })
  endTime?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

// ── Query Schedules ──────────────────────────────────────────────────────────
export class QueryScheduleDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsIn([
    ShiftScheduleStatus.DRAFT,
    ShiftScheduleStatus.PUBLISHED,
    ShiftScheduleStatus.STARTED,
    ShiftScheduleStatus.CANCELLED,
  ])
  status?: ShiftScheduleStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // Must stay >= the POS LIST_FETCH_CAP (apps/pos-desktop routes/shifts/index.tsx):
  // the schedule list groups by employee, so it loads the whole filtered set in
  // one page rather than paginating (which would split a person across pages).
  @Max(500)
  limit: number = 25;
}

// ── Publish / Unpublish (bulk) ───────────────────────────────────────────────
export class PublishScheduleDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one schedule ID required' })
  @IsString({ each: true })
  @MinLength(1, { each: true })
  ids!: string[];
}

// ── Range Query (bounded calendar feed, no pagination) ───────────────────────
export class QueryScheduleRangeDto {
  @Type(() => Date)
  @IsDate()
  from!: Date;

  @Type(() => Date)
  @IsDate()
  to!: Date;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

// ── Create Recurring (dateless weekly pattern) ───────────────────────────────
// A fixed weekly shift stored as ONE row (no calendar date). `daysOfWeek` uses
// 0 = Sunday … 6 = Saturday to match `Date.getUTCDay()`. `startTime`/`endTime`
// are wall-clock "HH:MM" — the server anchors them to a sentinel date.
const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateRecurringScheduleDto {
  @IsString()
  @MinLength(1, { message: 'Branch ID is required' })
  branchId!: string;

  @IsString()
  @MinLength(1, { message: 'User ID is required' })
  userId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  deviceId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one day of week' })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek!: number[];

  @IsString()
  @Matches(HHMM_PATTERN, { message: 'startTime must be in HH:MM format' })
  startTime!: string;

  @IsString()
  @Matches(HHMM_PATTERN, { message: 'endTime must be in HH:MM format' })
  endTime!: string;

  // Optional window the pattern applies within (null/absent = ongoing).
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @IsAfterField('effectiveFrom', {
    orEqual: true,
    message: 'End date must be on or after the start date',
  })
  effectiveTo?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
