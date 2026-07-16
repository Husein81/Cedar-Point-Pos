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

export interface ReportListParams extends ReportsFilterState {
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  limit?: number;
}

export type DateRangePreset =
  "today" | "yesterday" | "this_week" | "this_month" | "custom";

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

export interface TopProductRow {
  productId: string;
  productName: string;
  categoryName: string | null;
  qtySold: number;
  revenue: number;
  avgUnitPrice: number;
}

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

export interface ProductProfitRow {
  productId: string;
  productName: string;
  categoryName: string | null;
  revenue: number;
  profit: number;
  margin: number;
  qtySold: number;
}

export interface CategoryRevenueRow {
  categoryId: string;
  categoryName: string;
  revenue: number;
  profit: number;
}

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

export type {
  WeeklySalesData,
  HourlyRevenueData,
  TopProductData,
} from "./dashboard.dto";
