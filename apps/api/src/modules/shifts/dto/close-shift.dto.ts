import { ShiftCloseMode } from '@repo/types';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Close preview request — returns expected cash and variance info.
 * In BLIND mode, countedCash is required upfront; expected is revealed after.
 */
export class ClosePreviewDto {
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Counted cash must be >= 0' })
  countedCash?: number;

  @IsOptional()
  @IsEnum(ShiftCloseMode)
  closeMode: ShiftCloseMode = ShiftCloseMode.NORMAL;
}

/**
 * Close shift request — finalizes shift with counted cash.
 * Approval is NEVER inline — use POST /shifts/:id/approve-close instead.
 */
export class CloseShiftDto {
  @IsNumber()
  @Min(0, { message: 'Counted cash must be >= 0' })
  countedCash!: number;

  @IsOptional()
  @IsEnum(ShiftCloseMode)
  closeMode: ShiftCloseMode = ShiftCloseMode.NORMAL;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/**
 * Manager approval for a shift that closed with NEEDS_APPROVAL result.
 */
export class ApproveCloseDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  approvalNote?: string;
}
