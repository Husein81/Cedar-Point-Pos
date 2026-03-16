import type { RxJsonSchema } from "rxdb";
import type { TableDocument } from "../types";

export const tableSchema: RxJsonSchema<TableDocument> = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 128,
    },
    tableNumber: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
    },
    tenantId: {
      type: "string",
      maxLength: 128,
    },
    branchId: {
      type: "string",
      maxLength: 128,
    },
    floorId: {
      type: ["string", "null"],
    },
    name: {
      type: "string",
    },
    capacity: {
      type: "number",
      multipleOf: 1,
      minimum: 1,
      default: 4,
    },
    status: {
      type: "string",
      maxLength: 32,
      enum: ["AVAILABLE", "OCCUPIED", "RESERVED"],
      default: "AVAILABLE",
    },
    isActive: {
      type: "boolean",
      default: true,
    },
    isDeleted: {
      type: "boolean",
      default: false,
    },
    createdAt: {
      type: "string",
      format: "date-time",
      maxLength: 30,
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      maxLength: 30,
    },
    isSynced: {
      type: "boolean",
      default: false,
    },
    isLocalOnly: {
      type: "boolean",
      default: false,
    },
  },
  required: [
    "id",
    "tableNumber",
    "tenantId",
    "branchId",
    "name",
    "capacity",
    "status",
    "isActive",
    "isDeleted",
    "createdAt",
    "updatedAt",
    "isSynced",
    "isLocalOnly",
  ],
  indexes: [
    "branchId",
    "tenantId",
    "status",
    "isDeleted",
    "isActive",
    "isSynced",
    "updatedAt",
  ],
};
