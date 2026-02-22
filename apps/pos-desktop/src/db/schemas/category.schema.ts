import type { RxJsonSchema } from "rxdb";
import type { CategoryDocument } from "../types";

export const categorySchema: RxJsonSchema<CategoryDocument> = {
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
    name: {
      type: "string",
    },
    code: {
      type: ["string", "null"],
    },
    description: {
      type: ["string", "null"],
    },
    colorId: {
      type: ["string", "null"],
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
    /** true = record is in sync with the server */
    isSynced: {
      type: "boolean",
      default: false,
    },
    /** true = was created locally and has never been pushed to the server */
    isLocalOnly: {
      type: "boolean",
      default: false,
    },
  },
  required: [
    "id",
    "tenantId",
    "name",
    "isDeleted",
    "createdAt",
    "updatedAt",
    "isSynced",
    "isLocalOnly",
  ],
  indexes: ["isSynced", "isDeleted", "updatedAt", "tenantId"],
};
