import { z } from 'zod';
import { ShiftCloseMode } from '@repo/types';

/**
 * Close preview request — returns expected cash and variance info.
 * In BLIND mode, countedCash is required upfront; expected is revealed after.
 */
export const closePreviewDto = z.object({
  countedCash: z.number().min(0, 'Counted cash must be >= 0').optional(),
  closeMode: z
    .enum([ShiftCloseMode.NORMAL, ShiftCloseMode.BLIND])
    .default(ShiftCloseMode.NORMAL),
});

export type ClosePreviewDto = z.infer<typeof closePreviewDto>;

/**
 * Close shift request — finalizes shift with counted cash.
 * Approval is NEVER inline — use POST /shifts/:id/approve-close instead.
 */
export const closeShiftDto = z.object({
  countedCash: z.number().min(0, 'Counted cash must be >= 0'),
  closeMode: z
    .enum([ShiftCloseMode.NORMAL, ShiftCloseMode.BLIND])
    .default(ShiftCloseMode.NORMAL),
  notes: z.string().max(500).optional(),
});

export type CloseShiftDto = z.infer<typeof closeShiftDto>;

/**
 * Manager approval for a shift that closed with NEEDS_APPROVAL result.
 */
export const approveCloseDto = z.object({
  approvalNote: z.string().max(500).optional(),
});

export type ApproveCloseDto = z.infer<typeof approveCloseDto>;
