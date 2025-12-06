import { OrderType } from '@repo/db';

export type CreateOrderItemDto = {
  productId: string;
  quantity: number;
  notes?: string;
};

export type CreateOrderDto = {
  branchId: string;
  type: OrderType;
  tableId?: string;
  deviceId?: string;
  shiftId?: string;
  customerId?: string;
  items?: CreateOrderItemDto[];
};
