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
    meta: PaginationMeta;
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
 * Payment Transaction Row - for /reports/payments/transactions table
 */
export interface PaymentTransactionRow {
    id: string;
    paidAt: string;
    method: string;
    currencyCode: string | null;
    amount: number;
    exchangeRate: number | null;
    order: {
        id: string;
        orderNumber: string | null;
        branch: { id: string; name: string };
        cashier: { id: string; name: string; username: string } | null;
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

// Re-export dashboard types that are reused
export type {
    WeeklySalesData,
    HourlyRevenueData,
    TopProductData,
} from "./dashboard";
