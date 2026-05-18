import { z } from "zod";
import { OrderStatus, OrderType } from "@repo/types";

const CustomerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
});
export type CustomerSummary = z.infer<typeof CustomerSummarySchema>;

const CustomerDetailsSchema = CustomerSummarySchema.extend({
  address: z.string().nullable(),
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  orderCount: z.number(),
});
export type CustomerDetails = z.infer<typeof CustomerDetailsSchema>;

const CustomerFullDetailsSchema = CustomerDetailsSchema.extend({
  updatedAt: z.string(),
  totalRevenue: z.number(),
  lastOrderAt: z.string().nullable(),
  averageOrderValue: z.number(),
  loyalty: z
    .object({
      pointsBalance: z.number(),
      lifetimeEarned: z.number(),
      lifetimeRedeemed: z.number(),
      lifetimeRestored: z.number(),
      lifetimeReversed: z.number(),
      lifetimeAdjusted: z.number(),
    })
    .optional(),
});

export type CustomerFullDetails = z.infer<
  typeof CustomerFullDetailsSchema
>;

const CustomerOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullable(),
  status: z.nativeEnum(OrderStatus),
  type: z.nativeEnum(OrderType),
  subtotal: z.string(),
  total: z.string(),
  discount: z.string().nullable(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  branch: z.object({
    id: z.string(),
    name: z.string(),
  }),
  payments: z.array(
    z.object({
      id: z.string(),
      method: z.string(),
      amount: z.string(),
    })
  ),
});
export type CustomerOrder = z.infer<typeof CustomerOrderSchema>;

const CreateCustomerSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});
export type CreateCustomerDto = z.infer<typeof CreateCustomerSchema>;
