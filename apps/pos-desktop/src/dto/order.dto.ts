import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  QueryParams,
} from "@repo/types";

export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
  unitPrice?: number; // Override product price
  discount?: {
    value: number;
    type: "PERCENTAGE" | "FIXED";
  }; // Item-level discount
  notes?: string;
  modifiers?: string[]; // Array of modifier IDs
}

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

export interface PaymentDto {
  amount: number;
  method: PaymentMethod;
  currencyCode?: string;
  exchangeRate?: number;
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
