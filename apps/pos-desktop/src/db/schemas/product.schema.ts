import type { RxJsonSchema } from "rxdb";
import type { ProductDocument } from "../types";

export const productSchema: RxJsonSchema<ProductDocument> = {
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
      type: ["string", "null"],
    },
    name: {
      type: "string",
    },
    description: {
      type: ["string", "null"],
    },
    imageUrl: {
      type: ["string", "null"],
    },
    sku: {
      type: ["string", "null"],
    },
    barcode: {
      type: ["string", "null"],
    },
    price: {
      type: ["string", "null"],
    },
    cost: {
      type: ["string", "null"],
    },
    categoryId: {
      type: ["string", "null"],
    },
    subcategoryId: {
      type: ["string", "null"],
    },
    isActive: {
      type: "boolean",
      default: true,
    },
    isDeleted: {
      type: "boolean",
      default: false,
    },
    isModifiable: {
      type: "boolean",
      default: false,
    },
    modifierGroups: {
      type: ["array", "null"],
      default: null,
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            maxLength: 128,
          },
          name: {
            type: "string",
          },
          type: {
            type: "string",
            enum: ["SINGLE", "MULTIPLE"],
          },
          modifiers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  maxLength: 128,
                },
                name: {
                  type: "string",
                },
                price: {
                  type: "string",
                },
                groupId: {
                  type: "string",
                  maxLength: 128,
                },
              },
              required: ["id", "name", "price", "groupId"],
            },
          },
        },
        required: ["id", "name", "type", "modifiers"],
      },
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
    "isActive",
    "isDeleted",
    "isModifiable",
    "createdAt",
    "updatedAt",
    "isSynced",
    "isLocalOnly",
  ],
  indexes: ["isSynced", "isDeleted", "isActive", "updatedAt", "tenantId"],
};
