import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  QueryParams,
} from "@repo/types";
import { z } from "zod";

export const CreateOrderItemDto = z.object({
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.number().optional(), // Override product price
  discount: z
    .object({
      value: z.number(),
      type: z.enum(["PERCENTAGE", "FIXED"]),
    })
    .optional(), // Item-level discount
  notes: z.string().optional(),
  modifiers: z.array(z.string()).optional(), // Array of modifier IDs
});
export type CreateOrderItemDto = z.infer<typeof CreateOrderItemDto>;

export interface CreateOrderDto {
  branchId: string;
  type: OrderType;
  tableId?: string;
  deviceId?: string;
  shiftId?: string;
  customerId?: string;
  items?: CreateOrderItemDto[];
  discount?: number; // Discount amount (must be >= 0)
  shippingFee?: number; // Shipping fee (must be >= 0)
  includeVAT?: boolean; // Whether to include VAT
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface UpdateOrderDiscountDto {
  discount: number;
}

export interface AssignTableDto {
  tableId: string;
}

export interface AddItemDto {
  productId: string;
  quantity: number;
  notes?: string;
  modifiers?: string[];
}

export interface UpdateQuantityDto {
  quantity: number;
}

export interface UpdateItemDiscountDto {
  value: number;
  type: "PERCENTAGE" | "FIXED";
}

export const PaymentDto = z.object({
  amount: z.number().positive(),
  method: z.nativeEnum(PaymentMethod),
  currencyCode: z.string().optional(),
  exchangeRate: z.number().positive().optional(),
});
export type PaymentDto = z.infer<typeof PaymentDto>;

/**
 * Optional loyalty redemption payload sent alongside payments.
 * Backend uses this to compute the loyalty discount on the order.
 */
export interface LoyaltyRedemptionPayload {
  redeemPoints: number;
}

export interface OrderFilters extends QueryParams {
  status?: OrderStatus;
  branchId?: string;
  userId?: string;
  type?: OrderType;
  startDate?: string;
  endDate?: string;
  tableId?: string;
}
