import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { reportsApi } from "../apis/reportsApi";
import type {
    SalesReportData,
    OrdersReportData,
    PaymentsReportData,
    InventoryReportData,
    DebtsReportData,
    CustomersReportData,
    FinancialsReportData,
    ReportsFilterState,
    ReportListParams,
    PaginatedResponse,
    SalesOrderRow,
    PaymentTransactionRow,
    InventoryMovementRow,
    TopProductRow,
    DebtOrderRow,
    CustomerReportRow,
    ProductProfitRow,
    CategoryRevenueRow,
} from "../types/reports";
import type {
    WeeklySalesData,
    HourlyRevenueData,
    TopProductData,
} from "../types/dashboard";

/**
 * Reports React Query Hooks
 * Provides data fetching with caching for reports page
 * Note: Uses enabled flag to prevent auto-fetch - Apply button triggers refetch
 */

// Query keys for cache management
export const reportsKeys = {
    all: ["reports"] as const,
    // Summary query keys (existing)
    sales: (
        from: string,
        to: string,
        branchId?: string,
        orderType?: string,
        paymentMethod?: string
    ) =>
        [
            ...reportsKeys.all,
            "sales",
            from,
            to,
            branchId,
            orderType,
            paymentMethod,
        ] as const,
    orders: (
        from: string,
        to: string,
        branchId?: string,
        orderType?: string,
        paymentMethod?: string
    ) =>
        [
            ...reportsKeys.all,
            "orders",
            from,
            to,
            branchId,
            orderType,
            paymentMethod,
        ] as const,
    payments: (
        from: string,
        to: string,
        branchId?: string,
        orderType?: string,
        paymentMethod?: string
    ) =>
        [
            ...reportsKeys.all,
            "payments",
            from,
            to,
            branchId,
            orderType,
            paymentMethod,
        ] as const,
    inventory: (from: string, to: string, branchId?: string) =>
        [...reportsKeys.all, "inventory", from, to, branchId] as const,
    weeklySales: (branchId?: string) =>
        [...reportsKeys.all, "weekly-sales", branchId] as const,
    hourlyRevenue: (branchId?: string) =>
        [...reportsKeys.all, "hourly-revenue", branchId] as const,
    topProducts: (from: string, to: string, branchId?: string, limit?: number) =>
        [...reportsKeys.all, "top-products", from, to, branchId, limit] as const,

    // List query keys (NEW - for data tables)
    salesOrdersList: (params: ReportListParams) =>
        [
            ...reportsKeys.all,
            "sales-orders-list",
            params.from.toISOString(),
            params.to.toISOString(),
            params.branchId,
            params.orderType,
            params.paymentMethod,
            params.status,
            params.userId,
            params.search,
            params.sortBy,
            params.sortDir,
            params.page,
            params.pageSize,
        ] as const,
    paymentTransactionsList: (params: ReportListParams) =>
        [
            ...reportsKeys.all,
            "payment-transactions-list",
            params.from.toISOString(),
            params.to.toISOString(),
            params.branchId,
            params.paymentMethod,
            params.userId,
            params.search,
            params.sortBy,
            params.sortDir,
            params.page,
            params.pageSize,
        ] as const,
    inventoryMovementsList: (params: ReportListParams) =>
        [
            ...reportsKeys.all,
            "inventory-movements-list",
            params.from.toISOString(),
            params.to.toISOString(),
            params.branchId,
            params.changeType,
            params.userId,
            params.search,
            params.sortBy,
            params.sortDir,
            params.page,
            params.pageSize,
        ] as const,
    topProductsReport: (params: ReportListParams) =>
        [
            ...reportsKeys.all,
            "products",
            "top",
            params.from.toISOString(),
            params.to.toISOString(),
            params.branchId,
            params.sortBy,
            params.sortDir,
            params.page,
            params.pageSize,
            params.limit,
        ] as const,
    debtsOrdersList: (params: ReportListParams) =>
        [
            ...reportsKeys.all,
            "debts",
            "orders",
            params.from.toISOString(),
            params.to.toISOString(),
            params.branchId,
            params.search,
            params.sortBy,
            params.sortDir,
            params.page,
            params.pageSize,
        ] as const,
    debts: (from: string, to: string, branchId?: string) =>
        [...reportsKeys.all, "debts", from, to, branchId] as const,
    customersReportList: (params: ReportListParams) =>
        [
            ...reportsKeys.all,
            "customers",
            "list",
            params.from.toISOString(),
            params.to.toISOString(),
            params.branchId,
            params.search,
            params.sortBy,
            params.sortDir,
            params.page,
            params.pageSize,
        ] as const,
    customers: (from: string, to: string, branchId?: string) =>
        [...reportsKeys.all, "customers", from, to, branchId] as const,
    financials: (from: string, to: string, branchId?: string) =>
        [...reportsKeys.all, "financials", from, to, branchId] as const,
    financialsProducts: (from: string, to: string, branchId?: string, limit?: number) =>
        [...reportsKeys.all, "financials", "products", from, to, branchId, limit] as const,
    financialsCategories: (from: string, to: string, branchId?: string) =>
        [...reportsKeys.all, "financials", "categories", from, to, branchId] as const,
};

interface ReportsQueryOptions {
    enabled?: boolean;
}

// ============================================================
// LIST HOOKS (NEW - for data-first reports)
// ============================================================

/**
 * Hook to fetch sales orders list with pagination
 * Used by /reports/sales table
 */
export const useSalesOrdersReport = (
    params: ReportListParams,
    options: ReportsQueryOptions = {}
): UseQueryResult<PaginatedResponse<SalesOrderRow>, Error> => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: reportsKeys.salesOrdersList(params),
        queryFn: () => reportsApi.getSalesOrdersList(params),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch payment transactions list with pagination
 * Used by /reports/payments table
 */
export const usePaymentTransactionsReport = (
    params: ReportListParams,
    options: ReportsQueryOptions = {}
): UseQueryResult<PaginatedResponse<PaymentTransactionRow>, Error> => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: reportsKeys.paymentTransactionsList(params),
        queryFn: () => reportsApi.getPaymentTransactionsList(params),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch inventory movements list with pagination
 * Used by /reports/inventory table
 */
export const useInventoryMovementsReport = (
    params: ReportListParams,
    options: ReportsQueryOptions = {}
): UseQueryResult<PaginatedResponse<InventoryMovementRow>, Error> => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: reportsKeys.inventoryMovementsList(params),
        queryFn: () => reportsApi.getInventoryMovementsList(params),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch top products report with pagination
 * Used by /reports/products table
 */
export const useTopProductsReportList = (
    params: ReportListParams,
    options: ReportsQueryOptions = {}
): UseQueryResult<PaginatedResponse<TopProductRow>, Error> => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: reportsKeys.topProductsReport(params),
        queryFn: () => reportsApi.getTopProductsReport(params),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch debts orders list with pagination
 * Used by /reports/debts table
 */
export const useDebtsOrdersList = (
    params: ReportListParams,
    options: ReportsQueryOptions = {}
): UseQueryResult<PaginatedResponse<DebtOrderRow>, Error> => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: reportsKeys.debtsOrdersList(params),
        queryFn: () => reportsApi.getDebtsOrdersList(params),
        enabled,
        staleTime: 60000,
    });
};

// ============================================================
// SUMMARY HOOKS (EXISTING - for dashboard/charts)
// ============================================================

/**
 * Hook to fetch sales report
 * Only fetches when enabled is true (after Apply button click)
 */
export const useReportsSales = (
    filters: ReportsFilterState,
    options: ReportsQueryOptions = {}
): UseQueryResult<SalesReportData, Error> => {
    const { enabled = true } = options;
    const { from, to, branchId, orderType, paymentMethod } = filters;

    return useQuery({
        queryKey: reportsKeys.sales(
            from.toISOString(),
            to.toISOString(),
            branchId,
            orderType,
            paymentMethod
        ),
        queryFn: () =>
            reportsApi.getSalesReport(from, to, branchId, orderType, paymentMethod),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch debts report
 * Only fetches when enabled is true (after Apply button click)
 */
export const useReportsDebts = (
    filters: ReportsFilterState,
    options: ReportsQueryOptions = {}
): UseQueryResult<DebtsReportData, Error> => {
    const { enabled = true } = options;
    const { from, to, branchId } = filters;

    return useQuery({
        queryKey: reportsKeys.debts(
            from.toISOString(),
            to.toISOString(),
            branchId
        ),
        queryFn: () => reportsApi.getDebtsReport(from, to, branchId),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch orders report
 */
export const useReportsOrders = (
    filters: ReportsFilterState,
    options: ReportsQueryOptions = {}
): UseQueryResult<OrdersReportData, Error> => {
    const { enabled = true } = options;
    const { from, to, branchId, orderType, paymentMethod } = filters;

    return useQuery({
        queryKey: reportsKeys.orders(
            from.toISOString(),
            to.toISOString(),
            branchId,
            orderType,
            paymentMethod
        ),
        queryFn: () =>
            reportsApi.getOrdersReport(from, to, branchId, orderType, paymentMethod),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch payments report
 */
/**
 * Hook to fetch payments report summary
 */
export const usePaymentsReport = (
    filters: ReportsFilterState,
    options: ReportsQueryOptions = {}
): UseQueryResult<PaymentsReportData, Error> => {
    const { enabled = true } = options;
    const { from, to, branchId } = filters;

    return useQuery({
        queryKey: reportsKeys.payments(
            from.toISOString(),
            to.toISOString(),
            branchId
        ),
        queryFn: () => reportsApi.getPaymentsReport(from, to, branchId),
        enabled,
        staleTime: 60000,
    });
};


/**
 * Hook to fetch inventory report
 */
export const useReportsInventory = (
    filters: ReportsFilterState,
    options: ReportsQueryOptions = {}
): UseQueryResult<InventoryReportData, Error> => {
    const { enabled = true } = options;
    const { from, to, branchId } = filters;

    return useQuery({
        queryKey: reportsKeys.inventory(
            from.toISOString(),
            to.toISOString(),
            branchId
        ),
        queryFn: () => reportsApi.getInventoryReport(from, to, branchId),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch weekly sales (for daily chart view)
 */
export const useReportsWeeklySales = (
    branchId?: string,
    options: ReportsQueryOptions = {}
): UseQueryResult<WeeklySalesData[], Error> => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: reportsKeys.weeklySales(branchId),
        queryFn: () => reportsApi.getWeeklySales(branchId),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch hourly revenue (for hourly chart view)
 */
export const useReportsHourlyRevenue = (
    branchId?: string,
    options: ReportsQueryOptions = {}
): UseQueryResult<HourlyRevenueData[], Error> => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: reportsKeys.hourlyRevenue(branchId),
        queryFn: () => reportsApi.getHourlyRevenue(branchId),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch top products (dashboard version)
 */
export const useReportsTopProducts = (
    filters: ReportsFilterState,
    limit = 10,
    options: ReportsQueryOptions = {}
): UseQueryResult<TopProductData[], Error> => {
    const { enabled = true } = options;
    const { from, to, branchId } = filters;

    return useQuery({
        queryKey: reportsKeys.topProducts(
            from.toISOString(),
            to.toISOString(),
            branchId,
            limit
        ),
        queryFn: () => reportsApi.getTopProducts(from, to, branchId, limit),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch customers report list with pagination
 * Used by /reports/customers table
 */
export const useCustomersReportList = (
    params: ReportListParams,
    options: ReportsQueryOptions = {}
): UseQueryResult<PaginatedResponse<CustomerReportRow>, Error> => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: reportsKeys.customersReportList(params),
        queryFn: () => reportsApi.getCustomersReportList(params),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch customers report summary
 * Only fetches when enabled is true (after Apply button click)
 */
export const useCustomersReport = (
    filters: ReportsFilterState,
    options: ReportsQueryOptions = {}
): UseQueryResult<CustomersReportData, Error> => {
    const { enabled = true } = options;
    const { from, to, branchId } = filters;

    return useQuery({
        queryKey: reportsKeys.customers(
            from.toISOString(),
            to.toISOString(),
            branchId
        ),
        queryFn: () => reportsApi.getCustomersReport(from, to, branchId),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch financials report summary
 * Only fetches when enabled is true (after Apply button click)
 */
export const useFinancialsReport = (
    filters: ReportsFilterState,
    options: ReportsQueryOptions = {}
): UseQueryResult<FinancialsReportData, Error> => {
    const { enabled = true } = options;
    const { from, to, branchId } = filters;

    return useQuery({
        queryKey: reportsKeys.financials(
            from.toISOString(),
            to.toISOString(),
            branchId
        ),
        queryFn: () => reportsApi.getFinancialsReport(from, to, branchId),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch products with profit data
 */
export const useProductsWithProfit = (
    filters: ReportsFilterState,
    limit = 5,
    options: ReportsQueryOptions = {}
): UseQueryResult<ProductProfitRow[], Error> => {
    const { enabled = true } = options;
    const { from, to, branchId } = filters;

    return useQuery({
        queryKey: reportsKeys.financialsProducts(
            from.toISOString(),
            to.toISOString(),
            branchId,
            limit
        ),
        queryFn: () => reportsApi.getProductsWithProfit(from, to, branchId, limit),
        enabled,
        staleTime: 60000,
    });
};

/**
 * Hook to fetch category revenue data
 */
export const useCategoryRevenue = (
    filters: ReportsFilterState,
    options: ReportsQueryOptions = {}
): UseQueryResult<CategoryRevenueRow[], Error> => {
    const { enabled = true } = options;
    const { from, to, branchId } = filters;

    return useQuery({
        queryKey: reportsKeys.financialsCategories(
            from.toISOString(),
            to.toISOString(),
            branchId
        ),
        queryFn: () => reportsApi.getCategoryRevenue(from, to, branchId),
        enabled,
        staleTime: 60000,
    });
};
