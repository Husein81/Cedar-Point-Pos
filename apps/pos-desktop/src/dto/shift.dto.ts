import {
  CashMovementType,
  ShiftCloseMode,
  ShiftScheduleStatus,
  ShiftStatus,
} from "@repo/types";
import { z } from "zod";

// ── Open Shift ───────────────────────────────────────────────────────────────
const OpenShiftSchema = z.object({
  branchId: z.string().min(1, "Branch ID is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  startCash: z.number().min(0, "Starting cash must be >= 0").default(0),
  scheduleId: z.string().min(1).optional(),
});
export type OpenShiftDto = z.infer<typeof OpenShiftSchema>;

// ── Close Preview ────────────────────────────────────────────────────────────
const ClosePreviewSchema = z.object({
  countedCash: z.number().min(0, "Counted cash must be >= 0").optional(),
  closeMode: z
    .enum([ShiftCloseMode.NORMAL, ShiftCloseMode.BLIND])
    .default(ShiftCloseMode.NORMAL),
});
export type ClosePreviewDto = z.infer<typeof ClosePreviewSchema>;

// ── Close Shift ──────────────────────────────────────────────────────────────
const CloseShiftSchema = z.object({
  countedCash: z.number().min(0, "Counted cash must be >= 0"),
  closeMode: z
    .enum([ShiftCloseMode.NORMAL, ShiftCloseMode.BLIND])
    .default(ShiftCloseMode.NORMAL),
  notes: z.string().max(500).optional(),
});
export type CloseShiftDto = z.infer<typeof CloseShiftSchema>;

// ── Approve Close ────────────────────────────────────────────────────────────
const ApproveCloseSchema = z.object({
  approvalNote: z.string().max(500).optional(),
});
export type ApproveCloseDto = z.infer<typeof ApproveCloseSchema>;

// ── Create Cash Movement ─────────────────────────────────────────────────────
const CreateCashMovementSchema = z.object({
  type: z.enum([CashMovementType.CASH_IN, CashMovementType.CASH_OUT]),
  amount: z.number().positive("Amount must be greater than 0"),
  reason: z.string().optional(),
  idempotencyKey: z.string().optional(),
});
export type CreateCashMovementDto = z.infer<typeof CreateCashMovementSchema>;

// ── Shift List Filters ───────────────────────────────────────────────────────
const ShiftFiltersSchema = z.object({
  branchId: z.string().optional(),
  deviceId: z.string().optional(),
  status: z.enum([ShiftStatus.OPEN, ShiftStatus.CLOSED]).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});
export type ShiftFilters = z.infer<typeof ShiftFiltersSchema>;

// ── Schedule Create ──────────────────────────────────────────────────────────
const CreateScheduleSchema = z
  .object({
    branchId: z.string().min(1, "Branch ID is required"),
    userId: z.string().min(1, "User ID is required"),
    deviceId: z.string().min(1).optional(),
    date: z.coerce.date(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });
export type CreateScheduleDto = z.infer<typeof CreateScheduleSchema>;

// ── Schedule Update ──────────────────────────────────────────────────────────
const UpdateScheduleSchema = z
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
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );
export type UpdateScheduleDto = z.infer<typeof UpdateScheduleSchema>;

// ── Schedule Query Filters ───────────────────────────────────────────────────
const ScheduleFiltersSchema = z.object({
  branchId: z.string().optional(),
  userId: z.string().optional(),
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
  page: z.number().optional(),
  limit: z.number().optional(),
});
export type ScheduleFilters = z.infer<typeof ScheduleFiltersSchema>;

// ── Publish / Unpublish (bulk) ───────────────────────────────────────────────
const PublishScheduleSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one schedule ID required"),
});
export type PublishScheduleDto = z.infer<typeof PublishScheduleSchema>;
