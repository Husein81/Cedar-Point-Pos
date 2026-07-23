// Domain models shared between the Electron main process and the renderer.
// These are the shapes that cross the IPC boundary — plain JSON, no Dates
// (timestamps travel as ISO strings), no class instances.

import type {
  CashMovementType,
  DiscountType,
  OrderStatus,
  PaymentMethod,
  ShiftStatus,
  StockMovementType,
  UserRole,
} from "./enums";

export type User = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  color: Color | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// Reusable named-color palette, picked when setting a category's color.
export type Color = {
  id: string;
  name: string;
  hex: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  stock: number;
  trackInventory: boolean;
  lowStockThreshold: number | null;
  categoryId: string | null;
  category: Category | null;
  imagePath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountType: DiscountType | null;
  discountValue: number;
  lineTotal: number;
  note: string | null;
};

export type Payment = {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerId: string | null;
  customerName: string | null;
  userId: string;
  userName: string | null;
  shiftId: string | null;
  subtotal: number;
  discountType: DiscountType | null;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  changeDue: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type OrderWithDetails = Order & {
  items: OrderItem[];
  payments: Payment[];
};

export type StockMovement = {
  id: string;
  productId: string;
  productName: string | null;
  type: StockMovementType;
  quantity: number;
  unitCost: number | null;
  reason: string | null;
  userId: string | null;
  createdAt: string;
};

export type Shift = {
  id: string;
  userId: string;
  userName: string | null;
  status: ShiftStatus;
  openingFloat: number;
  expectedCash: number | null;
  actualCash: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
  note: string | null;
};

export type CashMovement = {
  id: string;
  shiftId: string;
  type: CashMovementType;
  amount: number;
  reason: string | null;
  userId: string | null;
  createdAt: string;
};

export type Settings = {
  businessName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currencyCode: string;
  currencySymbol: string;
  receiptFooter: string | null;
  taxRate: number;
  logoPath: string | null;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  printerName: string | null;
  receiptWidthMm: number;
  theme: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
