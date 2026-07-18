import type {
  OrderStatus,
  OrderType,
  PaymentStatus,
  TableShape,
  TableStatus,
  UserRole,
} from "@repo/types";

/** Public user shape returned by /auth (secrets already stripped server-side). */
export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  isActive: boolean;
  tenantId: string;
  branchId?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
}

export interface Category {
  id: string;
  name: string;
  imageUrl?: string | null;
  subcategories?: { id: string; name: string }[];
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  barcode?: string | null;
  isActive?: boolean;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  total: number | string;
  notes?: string | null;
  product?: { id: string; name: string; imageUrl?: string | null } | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  type: OrderType;
  subtotal: number | string;
  vat: number | string;
  discount: number | string;
  total: number | string;
  includeVAT?: boolean;
  guestCount?: number | null;
  tableId?: string | null;
  table?: { id: string; name: string } | null;
  customer?: { id: string; name: string } | null;
  user?: { id: string; name: string } | null;
  items?: OrderItem[];
  payments?: { id: string; amount: number | string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedOrders {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

/** Table row from GET /tables/branch/:branchId/overview */
export interface TableOverview {
  id: string;
  name: string;
  tableNumber: number;
  capacity: number;
  status: TableStatus;
  shape?: TableShape | null;
  isActive: boolean;
  floorId?: string | null;
  floor?: { id: string; name: string } | null;
  activeOrder: {
    orderId: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus?: PaymentStatus;
    total: number | string;
    paidAmount: number;
    itemCount: number;
    guestCount?: number | null;
    createdAt: string;
    userName: string | null;
    customerName: string | null;
  } | null;
}
