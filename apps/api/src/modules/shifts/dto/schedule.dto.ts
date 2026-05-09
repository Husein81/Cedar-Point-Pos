import { z } from 'zod';
import { ShiftScheduleStatus } from '@repo/types';

// ── Create Schedule ──────────────────────────────────────────────────────────
export const createScheduleDto = z
  .object({
    branchId: z.string().min(1, 'Branch ID is required'),
    userId: z.string().min(1, 'User ID is required'),
    deviceId: z.string().min(1).optional(),
    date: z.coerce.date(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })
  .refine(
    (d) =>
      d.date.toISOString().slice(0, 10) ===
      d.startTime.toISOString().slice(0, 10),
    {
      message: 'Schedule date must match the calendar day of startTime',
      path: ['date'],
    },
  );

export type CreateScheduleDto = z.infer<typeof createScheduleDto>;

// ── Update Schedule ──────────────────────────────────────────────────────────
export const updateScheduleDto = z
  .object({
    userId: z.string().min(1).optional(),
    deviceId: z.string().min(1).nullable().optional(),
    date: z.coerce.date().optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine(
    (d) => {
      if (d.startTime && d.endTime) return d.endTime > d.startTime;
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    },
  );

export type UpdateScheduleDto = z.infer<typeof updateScheduleDto>;

// ── Query Schedules ──────────────────────────────────────────────────────────
export const queryScheduleDto = z.object({
  branchId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z
    .enum([
      ShiftScheduleStatus.DRAFT,
      ShiftScheduleStatus.PUBLISHED,
      ShiftScheduleStatus.STARTED,
      ShiftScheduleStatus.CANCELLED,
    ])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type QueryScheduleDto = z.infer<typeof queryScheduleDto>;

// ── Publish / Unpublish (bulk) ───────────────────────────────────────────────
export const publishScheduleDto = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one schedule ID required'),
});

export type PublishScheduleDto = z.infer<typeof publishScheduleDto>;
