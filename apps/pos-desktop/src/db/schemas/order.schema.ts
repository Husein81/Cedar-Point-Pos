import { OrderStatus, OrderType } from "@repo/types";
import type { RxJsonSchema } from "rxdb";
import type { OrderDocument } from "../types";

export const orderSchema: RxJsonSchema<OrderDocument> = {
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
    userId: {
      type: ["string", "null"],
    },
    branchId: {
      type: "string",
      maxLength: 128,
    },
    tableId: {
      type: ["string", "null"],
    },
    deviceId: {
      type: ["string", "null"],
    },
    shiftId: {
      type: ["string", "null"],
    },
    customerId: {
      type: ["string", "null"],
    },
    orderNumber: {
      type: ["string", "null"],
    },
    type: {
      type: "string",
      enum: Object.values(OrderType),
      maxLength: 32,
    },
    status: {
      type: "string",
      enum: Object.values(OrderStatus),
      maxLength: 32,
    },
    subtotal: {
      type: "string",
    },
    total: {
      type: "string",
    },
    discount: {
      type: ["string", "null"],
    },
    shippingFee: {
      type: ["string", "null"],
    },
    includeVAT: {
      type: "boolean",
      default: false,
    },
    vat: {
      type: ["string", "null"],
    },
    completedAt: {
      type: ["string", "null"],
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            maxLength: 128,
          },
          sourceItemId: {
            type: "string",
            maxLength: 128,
          },
          productId: {
            type: "string",
            maxLength: 128,
          },
          name: {
            type: "string",
          },
          quantity: {
            type: "number",
            minimum: 0,
          },
          unitPrice: {
            type: "string",
          },
          notes: {
            type: ["string", "null"],
          },
          imageUrl: {
            type: ["string", "null"],
          },
          modifiers: {
            type: ["array", "null"],
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  maxLength: 128,
                },
                modifierId: {
                  type: "string",
                  maxLength: 128,
                },
                name: {
                  type: "string",
                },
                price: {
                  type: "string",
                },
              },
              required: ["id", "modifierId", "name", "price"],
            },
          },
          discount: {
            type: ["object", "null"],
            properties: {
              value: {
                type: "number",
                minimum: 0,
              },
              type: {
                type: "string",
                enum: ["PERCENTAGE", "FIXED"],
              },
            },
            required: ["value", "type"],
          },
        },
        required: [
          "id",
          "sourceItemId",
          "productId",
          "name",
          "quantity",
          "unitPrice",
        ],
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
    isSynced: {
      type: "boolean",
      default: false,
    },
    isLocalOnly: {
      type: "boolean",
      default: false,
    },
    syncError: {
      type: ["string", "null"],
    },
    lastSyncedAt: {
      type: ["string", "null"],
    },
  },
  required: [
    "id",
    "tenantId",
    "branchId",
    "type",
    "status",
    "subtotal",
    "total",
    "includeVAT",
    "items",
    "createdAt",
    "updatedAt",
    "isSynced",
    "isLocalOnly",
  ],
  indexes: [
    "isSynced",
    "updatedAt",
    "tenantId",
    "branchId",
    "status",
    ["branchId", "status"],
  ],
};
