import { PaymentEntry } from "@/components/orders/PaymentForm";
import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  QueryParams,
  Order as ServerOrder,
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

export type DiscountType = "PERCENTAGE" | "FIXED";

export type OrderItemModifier = {
  modifierId: string;
  name: string;
  price: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
  modifiers?: OrderItemModifier[]; // Restaurant modifiers
  discount?: {
    value: number;
    type: "PERCENTAGE" | "FIXED";
  };
  sentToKitchen?: boolean;
};

export type OrderDiscount = {
  type: DiscountType;
  value: number;
};

export type Order = {
  id: string;
  status: OrderStatus;
  type?: OrderType;
  items: OrderItem[];
  discount: OrderDiscount | null;
  shippingFee: number;
  includeVAT: boolean;
  paidAmount: number;
  customerId: string | null;
  customerName: string | null;
  customerAddress: string | null;
  tableId: string | null;
  tableName: string | null;
  notes: string;
  orderNumber?: string;
  createdAt: Date;
  modifiedAt: Date;
};

export type OrderTab = {
  id: string;
  label: string;
  order: Order;
};

export type ServerOrderWithPayments = ServerOrder & {
  payments?: Array<{ amount?: number | string | null }>;
};

type BackendOrderItem = {
  id: string;
  productId: string;
  quantity: number | string;
  unitPrice: number | string;
  notes?: string | null;
  discount?: { value: number; type: "PERCENTAGE" | "FIXED" } | null;
  product?: {
    id: string;
    name: string;
    imageUrl?: string | null;
  } | null;
  modifiers?: Array<{
    modifierId: string;
    price: number | string;
    modifier?: {
      id: string;
      name: string;
    } | null;
  }>;
};

export type BackendOrder = {
  id: string;
  status: OrderStatus;
  type?: OrderType;
  items: BackendOrderItem[];
  payments?: PaymentEntry[];
  discount?: number | null;
  shippingFee?: number | string | null;
  includeVAT?: boolean;
  customerId?: string | null;
  customer?: { name: string; address?: string | null } | null;
  tableId?: string | null;
  table?: { name: string } | null;
  notes?: string | null;
  orderNumber?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
};
