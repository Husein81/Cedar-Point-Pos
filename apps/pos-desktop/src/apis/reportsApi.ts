import { api } from "./api";
import type {
    SalesReportData,
    PaymentsReportData,
    OrdersReportData,
    InventoryReportData,
    ReportListParams,
    PaginatedResponse,
    SalesOrderRow,
    PaymentTransactionRow,
    InventoryMovementRow,
    TopProductRow,
} from "../types/reports";
import type {
    WeeklySalesData,
    HourlyRevenueData,
    TopProductData,
} from "../types/dashboard";

/**
 * Reports API Client
 * Handles all reports-related API calls with proper error handling
 */

interface ReportQueryParams {
    from: string;
    to: string;
    branchId?: string;
    orderType?: string;
    paymentMethod?: string;
    status?: string;
    changeType?: string;
    userId?: string;
    search?: string;
    sortBy?: string;
    sortDir?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
}

const basePath = "/reports";

/**
 * Builds query params from ReportListParams
 * Converts Dates to ISO strings and filters out undefined values
 */
function buildListParams(params: ReportListParams): ReportQueryParams {
    return {
        from: params.from.toISOString(),
        to: params.to.toISOString(),
        ...(params.branchId && { branchId: params.branchId }),
        ...(params.orderType && { orderType: params.orderType }),
        ...(params.paymentMethod && { paymentMethod: params.paymentMethod }),
        ...(params.status && { status: params.status }),
        ...(params.changeType && { changeType: params.changeType }),
        ...(params.userId && { userId: params.userId }),
        ...(params.search && { search: params.search }),
        ...(params.sortBy && { sortBy: params.sortBy }),
        ...(params.sortDir && { sortDir: params.sortDir }),
        ...(params.page && { page: params.page }),
        ...(params.pageSize && { pageSize: params.pageSize }),
        ...(params.limit && { limit: params.limit }),
    };
}

export const reportsApi = {
    // ============================================================
    // LIST ENDPOINTS (NEW - for data-first reports)
    // ============================================================

    /**
     * Fetch sales orders list with pagination
     * GET /reports/sales/orders
     */
    async getSalesOrdersList(
        params: ReportListParams
    ): Promise<PaginatedResponse<SalesOrderRow>> {
        const queryParams = buildListParams(params);
        const { data } = await api.get<PaginatedResponse<SalesOrderRow>>(
            `${basePath}/sales/orders`,
            { params: queryParams }
        );
        return data;
    },

    /**
     * Fetch payment transactions list with pagination
     * GET /reports/payments/transactions
     */
    async getPaymentTransactionsList(
        params: ReportListParams
    ): Promise<PaginatedResponse<PaymentTransactionRow>> {
        const queryParams = buildListParams(params);
        const { data } = await api.get<PaginatedResponse<PaymentTransactionRow>>(
            `${basePath}/payments/transactions`,
            { params: queryParams }
        );
        return data;
    },

    /**
     * Fetch inventory movements list with pagination
     * GET /reports/inventory/movements
     */
    async getInventoryMovementsList(
        params: ReportListParams
    ): Promise<PaginatedResponse<InventoryMovementRow>> {
        const queryParams = buildListParams(params);
        const { data } = await api.get<PaginatedResponse<InventoryMovementRow>>(
            `${basePath}/inventory/movements`,
            { params: queryParams }
        );
        return data;
    },

    /**
     * Fetch top products report with pagination
     * GET /reports/products/top
     */
    async getTopProductsReport(
        params: ReportListParams
    ): Promise<PaginatedResponse<TopProductRow>> {
        const queryParams = buildListParams(params);
        const { data } = await api.get<PaginatedResponse<TopProductRow>>(
            `${basePath}/products/top`,
            { params: queryParams }
        );
        return data;
    },

    // ============================================================
    // SUMMARY ENDPOINTS (EXISTING - for dashboard/charts)
    // ============================================================

    /**
     * Fetch sales report summary
     */
    async getSalesReport(
        from: Date,
        to: Date,
        branchId?: string,
        orderType?: string,
        paymentMethod?: string
    ): Promise<SalesReportData> {
        const params: ReportQueryParams = {
            from: from.toISOString(),
            to: to.toISOString(),
            ...(branchId && { branchId }),
            ...(orderType && { orderType }),
            ...(paymentMethod && { paymentMethod }),
        };
        const { data } = await api.get<SalesReportData>(`${basePath}/sales`, {
            params,
        });
        return data;
    },

    /**
     * Fetch orders report (grouped by status)
     */
    async getOrdersReport(
        from: Date,
        to: Date,
        branchId?: string,
        orderType?: string,
        paymentMethod?: string
    ): Promise<OrdersReportData> {
        const params: ReportQueryParams = {
            from: from.toISOString(),
            to: to.toISOString(),
            ...(branchId && { branchId }),
            ...(orderType && { orderType }),
            ...(paymentMethod && { paymentMethod }),
        };
        const { data } = await api.get<OrdersReportData>(`${basePath}/orders`, {
            params,
        });
        return data;
    },

    /**
     * Fetch payments report (grouped by payment method)
     */
    async getPaymentsReport(
        from: Date,
        to: Date,
        branchId?: string,
        orderType?: string,
        paymentMethod?: string
    ): Promise<PaymentsReportData> {
        const params: ReportQueryParams = {
            from: from.toISOString(),
            to: to.toISOString(),
            ...(branchId && { branchId }),
            ...(orderType && { orderType }),
            ...(paymentMethod && { paymentMethod }),
        };
        const { data } = await api.get<PaymentsReportData>(`${basePath}/payments`, {
            params,
        });
        return data;
    },

    /**
     * Fetch inventory report (stock movements summary)
     */
    async getInventoryReport(
        from: Date,
        to: Date,
        branchId?: string
    ): Promise<InventoryReportData> {
        const params: ReportQueryParams = {
            from: from.toISOString(),
            to: to.toISOString(),
            ...(branchId && { branchId }),
        };
        const { data } = await api.get<InventoryReportData>(
            `${basePath}/inventory`,
            { params }
        );
        return data;
    },

    /**
     * Fetch weekly sales data for the last 7 days
     */
    async getWeeklySales(branchId?: string): Promise<WeeklySalesData[]> {
        const params = branchId ? { branchId } : {};
        const { data } = await api.get<WeeklySalesData[]>(
            `${basePath}/dashboard/weekly-sales`,
            { params }
        );
        return data;
    },

    /**
     * Fetch hourly revenue distribution for today
     */
    async getHourlyRevenue(branchId?: string): Promise<HourlyRevenueData[]> {
        const params = branchId ? { branchId } : {};
        const { data } = await api.get<HourlyRevenueData[]>(
            `${basePath}/dashboard/hourly-revenue`,
            { params }
        );
        return data;
    },

    /**
     * Fetch top selling products (dashboard version)
     */
    async getTopProducts(
        from: Date,
        to: Date,
        branchId?: string,
        limit = 10
    ): Promise<TopProductData[]> {
        const params: ReportQueryParams = {
            from: from.toISOString(),
            to: to.toISOString(),
            limit,
            ...(branchId && { branchId }),
        };
        const { data } = await api.get<TopProductData[]>(
            `${basePath}/dashboard/top-products`,
            { params }
        );
        return data;
    },
};
