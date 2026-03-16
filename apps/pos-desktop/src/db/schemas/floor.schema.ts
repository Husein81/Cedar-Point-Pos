import type { RxJsonSchema } from "rxdb";
import type { FloorDocument } from "../types";

export const floorSchema: RxJsonSchema<FloorDocument> = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 128,
    },
    tenantId: {
      type: "string",
      maxLength: 128,
    },
    branchId: {
      type: "string",
      maxLength: 128,
    },
    name: {
      type: "string",
    },
    order: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      default: 0,
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
    "tenantId",
    "branchId",
    "name",
    "order",
    "isDeleted",
    "createdAt",
    "updatedAt",
    "isSynced",
    "isLocalOnly",
  ],
  indexes: ["branchId", "tenantId", "isDeleted", "isSynced", "updatedAt"],
};
