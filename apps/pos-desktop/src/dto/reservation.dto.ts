import { ReservationSource, ReservationStatus } from "@repo/types";
import { z } from "zod";

// Reuse the shared enums (never reconstruct). z.enum needs a tuple of literals;
// derive it from the canonical const objects in @repo/types.
const reservationStatusValues = Object.values(ReservationStatus) as [
  ReservationStatus,
  ...ReservationStatus[],
];
const reservationSourceValues = Object.values(ReservationSource) as [
  ReservationSource,
  ...ReservationSource[],
];

const ReservationStatusSchema = z.enum(reservationStatusValues);
const ReservationSourceSchema = z.enum(reservationSourceValues);

/** "HH:mm" 24-hour clock. */
const TIME_OF_DAY_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/* -------------------------------------------------------------------------- */
/*                              Reservation shape                              */
/* -------------------------------------------------------------------------- */

const ReservationTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  tableNumber: z.number(),
  capacity: z.number(),
});

const ReservationCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
});

const ReservationCreatedBySchema = z.object({
  id: z.string(),
  name: z.string(),
});

const ReservationOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullable(),
  status: z.string(),
  total: z.union([z.string(), z.number()]),
});

export const ReservationSchema = z.object({
  id: z.string(),
  reservationNumber: z.string(),
  tenantId: z.string(),
  branchId: z.string(),
  customerId: z.string().nullable(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string().nullable(),
  tableId: z.string().nullable(),
  orderId: z.string().nullable(),
  guestCount: z.number(),
  reservationDate: z.string(), // ISO
  reservationTime: z.string(), // HH:mm
  reservationAt: z.string(), // ISO instant
  durationMinutes: z.number(),
  status: ReservationStatusSchema,
  source: ReservationSourceSchema,
  notes: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  table: ReservationTableSchema.nullable().optional(),
  customer: ReservationCustomerSchema.nullable().optional(),
  createdBy: ReservationCreatedBySchema.nullable().optional(),
  order: ReservationOrderSchema.nullable().optional(),
});

export type Reservation = z.infer<typeof ReservationSchema>;

/* -------------------------------------------------------------------------- */
/*                                Form payloads                               */
/* -------------------------------------------------------------------------- */

export const CreateReservationSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required").max(120),
  customerPhone: z.string().min(3, "Phone is required").max(30),
  customerEmail: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  tableId: z.string().optional(),
  guestCount: z.number().int().min(1, "At least 1 guest"),
  reservationDate: z.string().min(1, "Date is required"), // ISO date
  reservationTime: z
    .string()
    .regex(TIME_OF_DAY_REGEX, "Time must be HH:mm"),
  durationMinutes: z.number().int().min(15).optional(),
  source: ReservationSourceSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateReservationDto = z.infer<typeof CreateReservationSchema>;

export const UpdateReservationSchema = CreateReservationSchema.partial()
  .omit({ branchId: true })
  .extend({
    status: ReservationStatusSchema.optional(),
  });

export type UpdateReservationDto = z.infer<typeof UpdateReservationSchema>;

/* -------------------------------------------------------------------------- */
/*                              Query / filters                               */
/* -------------------------------------------------------------------------- */

export type ReservationFilters = {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
  tableId?: string;
  customerId?: string;
  phone?: string;
  status?: ReservationStatus;
  source?: ReservationSource;
  createdById?: string;
  reservationNumber?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
  order?: "asc" | "desc";
};

/* -------------------------------------------------------------------------- */
/*                          Availability check result                         */
/* -------------------------------------------------------------------------- */

export type AvailabilityTable = {
  id: string;
  name: string;
  tableNumber: number;
  capacity: number;
  status: string;
};

export type AvailabilityResult = {
  availableTables: AvailabilityTable[];
  unavailableTables: AvailabilityTable[];
  suggestedTables: AvailabilityTable[];
  nextAvailableTime: string | null;
};

export type AvailabilityQuery = {
  branchId: string;
  reservationDate: string;
  reservationTime: string;
  durationMinutes?: number;
  guestCount?: number;
  excludeReservationId?: string;
};

export type SeatReservationDto = {
  tableId?: string;
  deviceId?: string;
  shiftId?: string;
};

/* -------------------------------------------------------------------------- */
/*                              Calendar payload                              */
/* -------------------------------------------------------------------------- */

export type ReservationCalendar = {
  date: string;
  reservations: Reservation[];
  byTable: Record<string, Reservation[]>;
  byHour: Record<string, Reservation[]>;
};
