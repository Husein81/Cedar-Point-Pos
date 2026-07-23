import type {
  Floor,
  Order,
  OrderStatus,
  Payment,
  PaymentStatus,
  TableShape,
  TableStatus,
} from "@repo/types";
import { z } from "zod";

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

const TableOrderSummarySchema = z.object({
  orderId: z.string(),
  orderNumber: z.string().nullable().optional(),
  status: z.custom<OrderStatus>(),
  paymentStatus: z.custom<PaymentStatus>().optional(),
  total: z.union([z.string(), z.number()]),
  paidAmount: z.number(),
  itemCount: z.number(),
  guestCount: z.number().nullable().optional(),
  createdAt: z.string(),
  userName: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  additionalCustomerNames: z.array(z.string()).optional(),
});
export type TableOrderSummary = z.infer<typeof TableOrderSummarySchema>;

const TableOverviewSchema = TableWithFloorSchema.extend({
  activeOrder: TableOrderSummarySchema.nullable(),
});
export type TableOverview = z.infer<typeof TableOverviewSchema>;

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
  }),
);
export type FloorWithTableCount = z.infer<typeof FloorWithTableCountSchema>;
