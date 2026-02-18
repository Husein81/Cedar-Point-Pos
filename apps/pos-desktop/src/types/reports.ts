/**
 * Reports Type Definitions
 * Contains all type definitions for the reports module
 */

// ============================================================
// Filter States
// ============================================================

/**
 * Base filter state for reports page
 */
export interface ReportsFilterState {
  from: Date;
  to: Date;
  branchId?: string;
  orderType?: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "RETAIL";
  paymentMethod?: "CASH" | "CARD" | "CREDIT" | "VOUCHER" | "ONLINE";
  status?: string;
  changeType?: string;
  userId?: string;
  search?: string;
  categoryId?: string;
}

/**
 * Extended params for list endpoints (includes pagination + sorting)
 */
export interface ReportListParams extends ReportsFilterState {
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  limit?: number;
}

// Date range preset options
export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "custom";

// ============================================================
// Pagination
// ============================================================

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============================================================
// Summary Report Responses (existing)
// ============================================================

export interface SalesReportData {
  totalRevenue: number;
  totalSubtotal: number;
  totalDiscount: number;
  orderCount: number;
  averageOrderValue: number;
  bestOrderType: string | null;
  dateRange: {
    from: string;
    to: string;
  };
  branchId: string | null;
}

export interface DebtsReportData {
  totalDebts: number;
  unpaidOrdersCount: number;
  topDebtorName: string | null;
  topDebtorAmount: number;
  dateRange: {
    from: string;
    to: string;
  };
  branchId: string | null;
}

export interface PaymentBreakdownItem {
  method: string;
  totalAmount: number;
  transactionCount: number;
}

export interface PaymentsReportData {
  paymentBreakdown: PaymentBreakdownItem[];
  grandTotal: number;
  dateRange: {
    from: string;
    to: string;
  };
  branchId: string | null;
}

export interface OrderStatusItem {
  status: string;
  count: number;
}

export interface OrdersReportData {
  ordersByStatus: OrderStatusItem[];
  totalOrders: number;
  dateRange: {
    from: string;
    to: string;
  };
  branchId: string | null;
}

export interface InventoryMovementItem {
  changeType: string;
  totalAdjustment: number;
  count: number;
}

export interface InventoryReportData {
  movementsByType: InventoryMovementItem[];
  totalMovements: number;
  dateRange: {
    from: string;
    to: string;
  };
  branchId: string | null;
}

// ============================================================
// List/Table Row Types (NEW - for data-first reports)
// ============================================================

/**
 * Sales Order Row - for /reports/sales/orders table
 */
export interface SalesOrderRow {
  id: string;
  orderNumber: string | null;
  type: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  branch: { id: string; name: string };
  cashier: { id: string; name: string; username: string } | null;
  subtotal: number;
  discount: number;
  total: number;
  paymentsSummary: {
    methods: Array<{
      method: string;
      amount: number;
      currencyCode: string | null;
    }>;
    totalPaid: number;
  };
}

/**
 * Debt Order Row - for /reports/debts/orders table
 */
export interface DebtOrderRow {
  id: string;
  orderNumber: string | null;
  createdAt: string;
  branch: { id: string; name: string };
  type: string;
  subtotal: number;
  discount: number;
  total: number;
  customer: { id: string; name: string } | null;
  cashier: { id: string; name: string; username: string } | null;
}

/**
 * Payment Transaction Row - for /reports/payments/transactions table
 */
export interface PaymentTransactionRow {
  id: string;
  paidAt: string;
  method: string;
  currencyCode: string | null;
  amount: number;
  exchangeRate: number | null;
  orderId: string;
  transactionId: string | null;
  order: {
    orderNumber: string | null;
    branch: { name: string };
    user: { name: string } | null;
    type: string;
    status: string;
  };
}

/**
 * Inventory Movement Row - for /reports/inventory/movements table
 */
export interface InventoryMovementRow {
  id: string;
  createdAt: string;
  changeType: string;
  beforeStock: number;
  afterStock: number;
  adjustment: number;
  reason: string | null;
  referenceId: string | null;
  referenceType: string | null;
  branch: { id: string; name: string };
  user: { id: string; name: string; username: string };
  product: { id: string; name: string };
}

/**
 * Top Product Row - for /reports/products/top table
 */
export interface TopProductRow {
  productId: string;
  productName: string;
  categoryName: string | null;
  qtySold: number;
  revenue: number;
  avgUnitPrice: number;
}

/**
 * Customer Report Row - for /reports/customers/list table
 */
export interface CustomerReportRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  ordersCount: number;
  totalSpent: number;
  outstandingDebt: number;
  lastOrderDate: string | null;
}

/**
 * Customers Report Summary Data - for /reports/customers
 */
export interface CustomersReportData {
  totalCustomers: number;
  activeCustomers: number;
  topCustomerName: string | null;
  topCustomerRevenue: number;
  averageCustomerSpend: number;
  dateRange: {
    from: string;
    to: string;
  };
  branchId: string | null;
}

/**
 * Financials Report Summary Data - for /reports/financials
 */
export interface FinancialsReportData {
  totalRevenue: number;
  totalProfits: number;
  totalDebts: number;
  topProfitProductName: string | null;
  topProfitProductProfit: number;
  dateRange: {
    from: string;
    to: string;
  };
  branchId: string | null;
}

/**
 * Product Profit Row - for financials products table
 */
export interface ProductProfitRow {
  productId: string;
  productName: string;
  categoryName: string | null;
  revenue: number;
  profit: number;
  margin: number;
  qtySold: number;
}

/**
 * Category Revenue Row - for financials category table
 */
export interface CategoryRevenueRow {
  categoryId: string;
  categoryName: string;
  revenue: number;
  profit: number;
}

// ============================================================
// Loyalty Report Types
// ============================================================

/**
 * Loyalty Summary Row - for /reports/loyalty
 */
export interface LoyaltySummaryData {
  totalAccounts: number;
  totalPointsInCirculation: number;
  totalLifetimeEarned: number;
  totalLifetimeRedeemed: number;
  totalLifetimeRestored: number;
  totalLifetimeReversed: number;
  totalLifetimeAdjusted: number;
  transactionsInPeriod: number;
}

/**
 * Loyalty Transaction Row - for /reports/loyalty/transactions table
 */
export interface LoyaltyTransactionReportRow {
  id: string;
  createdAt: string;
  type: string;
  direction: string;
  points: number;
  moneyAmount: number | null;
  balanceAfter: number;
  reason: string | null;
  customer: { id: string; name: string } | null;
  order: { id: string; orderNumber: string | null } | null;
  refund: { id: string } | null;
  actorUser: { id: string; name: string } | null;
}

/**
 * Payments Report Summary Data - for /reports/payments
 */
export interface PaymentsReportData {
  totalAmount: number;
  paymentsCount: number;
  mostUsedMethod: string | null;
  paymentBreakdown: PaymentMethodBreakdown[];
  dateRange: {
    from: string;
    to: string;
  };
  branchId: string | null;
}

export interface PaymentMethodBreakdown {
  method: string;
  totalAmount: number;
  transactionCount: number;
}

// Re-export dashboard types that are reused
export type {
  WeeklySalesData,
  HourlyRevenueData,
  TopProductData,
} from "./dashboard";
