import { z } from "zod";

const CustomerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
});
export type CustomerSummary = z.infer<typeof CustomerSummarySchema>;

const CustomerDetailsSchema = CustomerSummarySchema.extend({
  address: z.string().nullable(),
  createdAt: z.string(),
  orderCount: z.number(),
});
export type CustomerDetails = z.infer<typeof CustomerDetailsSchema>;

const CustomerFullDetailsSchema = CustomerDetailsSchema.extend({
  updatedAt: z.string(),
  totalRevenue: z.number(),
  lastOrderAt: z.string().nullable(),
  averageOrderValue: z.number(),
});
export type CustomerFullDetails = z.infer<typeof CustomerFullDetailsSchema>;

const CustomerOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullable(),
  type: z.string(),
  status: z.string(),
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
