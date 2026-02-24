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

export const ScheduleDateModeSchema = z.enum(["single", "range"]);
export type ScheduleDateMode = z.infer<typeof ScheduleDateModeSchema>;

export const ScheduleTimeRangeOverrideSchema = z.object({
  date: z.string(),
  start: z.string(),
  end: z.string(),
});
export type ScheduleTimeRangeOverride = z.infer<
  typeof ScheduleTimeRangeOverrideSchema
>;

export const ScheduleBatchCreateResultSchema = z.object({
  created: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  failures: z.array(
    z.object({
      date: z.string(),
      message: z.string(),
    }),
  ),
});
export type ScheduleBatchCreateResult = z.infer<
  typeof ScheduleBatchCreateResultSchema
>;

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

// —— Close Preview Response ——————————————————————————————————————————————————————
export const ShiftPaymentSummarySchema = z.object({
  method: z.string(),
  salesCount: z.number().int().nonnegative(),
  salesTotal: z.number(),
  refundsCount: z.number().int().nonnegative(),
  refundsTotal: z.number(),
  netTotal: z.number(),
});

export const ClosePreviewResponseSchema = z.object({
  shiftId: z.string(),
  startCash: z.number(),
  expectedCash: z.number().nullable(),
  countedCash: z.number().nullable(),
  varianceAmount: z.number().nullable(),
  variancePercent: z.number().nullable(),
  cashBreakdown: z.record(z.string(), z.number()).nullable(),
  paymentSummary: z.array(ShiftPaymentSummarySchema),
  needsApproval: z.boolean(),
  hasWarning: z.boolean(),
  thresholds: z.object({
    warningPercent: z.number(),
    approvalRequiredPercent: z.number(),
  }),
});
export type ClosePreviewResponse = z.infer<typeof ClosePreviewResponseSchema>;

// —— X Report Response ————————————————————————————————————————————————————————————
export const XReportResponseSchema = z.object({
  type: z.string(),
  shiftId: z.string(),
  status: z.string(),
  startTime: z.string(),
  currentTime: z.string(),
  branch: z.object({ id: z.string(), name: z.string() }),
  device: z.object({ id: z.string(), name: z.string() }),
  cashier: z.object({ id: z.string(), name: z.string() }),
  startCash: z.number(),
  expectedCash: z.number(),
  countedCash: z.number().nullable(),
  varianceAmount: z.number(),
  variancePercent: z.number(),
  cashBreakdown: z.record(z.string(), z.number()),
  paymentSummary: z.array(ShiftPaymentSummarySchema),
  orders: z.object({
    byStatus: z.array(
      z.object({
        status: z.string(),
        count: z.number().int().nonnegative(),
      }),
    ),
    totalCount: z.number().int().nonnegative(),
  }),
  refunds: z.object({
    count: z.number().int().nonnegative(),
    total: z.number(),
  }),
  totals: z.object({
    grossSales: z.number(),
    totalRefunds: z.number(),
    netSales: z.number(),
  }),
  generatedAt: z.string(),
});
export type XReportResponse = z.infer<typeof XReportResponseSchema>;

// —— Schedule Response Types ———————————————————————————————————————————————————————
export const ShiftScheduleUserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ShiftScheduleBranchSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ShiftScheduleDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ShiftScheduleWithRelationsSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  branchId: z.string(),
  userId: z.string(),
  deviceId: z.string().nullable().optional(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().nullable().optional(),
  status: z.enum([
    ShiftScheduleStatus.DRAFT,
    ShiftScheduleStatus.PUBLISHED,
    ShiftScheduleStatus.STARTED,
    ShiftScheduleStatus.CANCELLED,
  ]),
  publishedAt: z.string().nullable().optional(),
  publishedById: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  user: ShiftScheduleUserSchema.nullable().optional(),
  branch: ShiftScheduleBranchSchema.nullable().optional(),
  device: ShiftScheduleDeviceSchema.nullable().optional(),
});
export type ShiftScheduleWithRelations = z.infer<
  typeof ShiftScheduleWithRelationsSchema
>;

export const ShiftScheduleTableRowSchema = ShiftScheduleWithRelationsSchema.extend(
  {
    userName: z.string(),
  },
);
export type ShiftScheduleTableRow = z.infer<typeof ShiftScheduleTableRowSchema>;

export const SchedulePaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const PaginatedShiftScheduleResponseSchema = z.object({
  data: z.array(ShiftScheduleWithRelationsSchema),
  pagination: SchedulePaginationSchema,
});
export type PaginatedShiftScheduleResponse = z.infer<
  typeof PaginatedShiftScheduleResponseSchema
>;

// —— Shift Schedule Component Types ——————————————————————————————————————————————
export type ShiftSchedulesTableProps = {
  filters?: ScheduleFilters;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEdit?: (schedule: ShiftScheduleWithRelations) => void;
  onDelete?: (schedule: ShiftScheduleWithRelations) => void;
  onPublish?: (scheduleId: string) => void;
  onUnpublish?: (scheduleId: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (visibleIds: string[]) => void;
};

export type ShiftScheduleFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  schedule?: ShiftScheduleWithRelations | null;
};

// —— Shift Component Props ——————————————————————————————————————————————————————
export type OpenShiftDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
};

export type CloseShiftDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
};

export type CashMovementDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
};

export type ShiftHistoryTableProps = {
  filters?: ShiftFilters;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
};

export type ShiftDetailPanelProps = {
  shiftId: string;
};

export type ShiftXReportPanelProps = {
  shiftId: string;
};
