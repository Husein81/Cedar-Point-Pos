import type { RxJsonSchema } from "rxdb";
import type { SubcategoryDocument } from "../types";

export const subcategorySchema: RxJsonSchema<SubcategoryDocument> = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 128,
    },
    categoryId: {
      type: "string",
      maxLength: 128,
    },
    name: {
      type: "string",
    },
    description: {
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
    "categoryId",
    "name",
    "isDeleted",
    "createdAt",
    "updatedAt",
    "isSynced",
    "isLocalOnly",
  ],
  indexes: ["categoryId", "isSynced", "isDeleted", "updatedAt"],
};
