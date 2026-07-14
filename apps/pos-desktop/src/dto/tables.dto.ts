import type {
  Floor,
  Order,
  OrderStatus,
  Payment,
  TableShape,
  TableStatus,
} from "@repo/types";
import { z } from "zod";

/**
 * Shape returned by GET /tables/:id/active-orders — the shared Order plus the
 * payment fields the backend includes for the table drawer.
 */
export type ActiveTableOrder = Order & {
  payments?: Payment[];
};

const CreateTableSchema = z.object({
  tableNumber: z.number(),
  branchId: z.string(),
  floorId: z.string().optional(),
  name: z.string(),
  capacity: z.number().optional(),
  shape: z.custom<TableShape>().optional(),
});
export type CreateTableDto = z.infer<typeof CreateTableSchema>;

const UpdateTableSchema = z.object({
  tableNumber: z.number().optional(),
  floorId: z.string().nullable().optional(),
  name: z.string().optional(),
  capacity: z.number().optional(),
  isActive: z.boolean().optional(),
  shape: z.custom<TableShape>().optional(),
});
export type UpdateTableDto = z.infer<typeof UpdateTableSchema>;

const UpdateTableStatusSchema = z.object({
  status: z.custom<TableStatus>(),
});
export type UpdateTableStatusDto = z.infer<typeof UpdateTableStatusSchema>;

const TableWithFloorSchema = z.object({
  id: z.string(),
  tableNumber: z.number(),
  tenantId: z.string(),
  branchId: z.string(),
  floorId: z.string().nullable().optional(),
  name: z.string(),
  capacity: z.number(),
  status: z.custom<TableStatus>(),
  isActive: z.boolean(),
  // Floor-plan geometry (world coordinates, px). Null posX/posY = not yet
  // placed on the canvas; the UI auto-arranges unplaced tables.
  posX: z.number().nullable().optional(),
  posY: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  rotation: z.number().optional(),
  shape: z.custom<TableShape>().optional(),
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  floor: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
});
export type TableWithFloor = z.infer<typeof TableWithFloorSchema>;

/** Lightweight summary of a table's most recent in-service order. */
const TableOrderSummarySchema = z.object({
  orderId: z.string(),
  orderNumber: z.string().nullable().optional(),
  status: z.custom<OrderStatus>(),
  total: z.union([z.string(), z.number()]),
  paidAmount: z.number(),
  itemCount: z.number(),
  guestCount: z.number().nullable().optional(),
  createdAt: z.string(),
  userName: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
});
export type TableOrderSummary = z.infer<typeof TableOrderSummarySchema>;

/** Floor-plan overview row: a table plus its active-order summary (if any). */
const TableOverviewSchema = TableWithFloorSchema.extend({
  activeOrder: TableOrderSummarySchema.nullable(),
});
export type TableOverview = z.infer<typeof TableOverviewSchema>;

/** One table's saved geometry, sent by the Floor Editor bulk save. */
const TableLayoutUpdateSchema = z.object({
  id: z.string(),
  posX: z.number(),
  posY: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  shape: z.custom<TableShape>().optional(),
});
export type TableLayoutUpdate = z.infer<typeof TableLayoutUpdateSchema>;

const TableStatsSchema = z.object({
  total: z.number(),
  available: z.number(),
  occupied: z.number(),
  reserved: z.number(),
});
export type TableStats = z.infer<typeof TableStatsSchema>;

const CreateFloorSchema = z.object({
  branchId: z.string(),
  name: z.string(),
  order: z.number().optional(),
});
export type CreateFloorDto = z.infer<typeof CreateFloorSchema>;

const UpdateFloorSchema = z.object({
  name: z.string().optional(),
  order: z.number().optional(),
});
export type UpdateFloorDto = z.infer<typeof UpdateFloorSchema>;

const FloorWithTableCountSchema = z.custom<Floor>().and(
  z.object({
    _count: z
      .object({
        tables: z.number(),
      })
      .optional(),
  })
);
export type FloorWithTableCount = z.infer<typeof FloorWithTableCountSchema>;
