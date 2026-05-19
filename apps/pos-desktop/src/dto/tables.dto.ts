import type { Floor, TableStatus } from "@repo/types";
import { z } from "zod";

const CreateTableSchema = z.object({
  tableNumber: z.number(),
  branchId: z.string(),
  floorId: z.string().optional(),
  name: z.string(),
  capacity: z.number().optional(),
});
export type CreateTableDto = z.infer<typeof CreateTableSchema>;

const UpdateTableSchema = z.object({
  tableNumber: z.number().optional(),
  floorId: z.string().nullable().optional(),
  name: z.string().optional(),
  capacity: z.number().optional(),
  isActive: z.boolean().optional(),
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
