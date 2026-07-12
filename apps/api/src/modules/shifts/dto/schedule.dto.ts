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
  Max,
  MaxLength,
  Min,
  MinLength,
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
  @Max(100)
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
