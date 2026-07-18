import { api } from "../lib/api";
import type {
  SalesReportData,
  PaymentsReportData,
  OrdersReportData,
  InventoryReportData,
  DebtsReportData,
  CustomersReportData,
  FinancialsReportData,
  ReportListParams,
  SalesOrderRow,
  PaymentTransactionRow,
  InventoryMovementRow,
  TopProductRow,
  DebtOrderRow,
  CustomerReportRow,
  ProductProfitRow,
  CategoryRevenueRow,
  LoyaltySummaryData,
  LoyaltyTransactionReportRow,
} from "../dto/reports.dto";
import type {
  WeeklySalesData,
  HourlyRevenueData,
  TopProductData,
} from "../dto/dashboard.dto";
import { PaginationResponse } from "@repo/types";

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
  async getSalesOrdersList(
    params: ReportListParams,
  ): Promise<PaginationResponse<SalesOrderRow>> {
    const queryParams = buildListParams(params);
    const { data } = await api.get<PaginationResponse<SalesOrderRow>>(
      `${basePath}/sales/orders`,
      { params: queryParams },
    );
    return data;
  },

  async getPaymentTransactionsList(
    params: ReportListParams,
  ): Promise<PaginationResponse<PaymentTransactionRow>> {
    const queryParams = buildListParams(params);
    const { data } = await api.get<PaginationResponse<PaymentTransactionRow>>(
      `${basePath}/payments/transactions`,
      { params: queryParams },
    );
    return data;
  },

  /**
   * Fetch inventory movements list with pagination
   * GET /reports/inventory/movements
   */
  async getInventoryMovementsList(
    params: ReportListParams,
  ): Promise<PaginationResponse<InventoryMovementRow>> {
    const queryParams = buildListParams(params);
    const { data } = await api.get<PaginationResponse<InventoryMovementRow>>(
      `${basePath}/inventory/movements`,
      { params: queryParams },
    );
    return data;
  },

  /**
   * Fetch top products report with pagination
   * GET /reports/products/top
   */
  async getTopProductsReport(
    params: ReportListParams,
  ): Promise<PaginationResponse<TopProductRow>> {
    const queryParams = buildListParams(params);
    const { data } = await api.get<PaginationResponse<TopProductRow>>(
      `${basePath}/products/top`,
      { params: queryParams },
    );
    return data;
  },

  /**
   * Fetch debts orders list with pagination
   * GET /reports/debts/orders
   */
  async getDebtsOrdersList(
    params: ReportListParams,
  ): Promise<PaginationResponse<DebtOrderRow>> {
    const queryParams = buildListParams(params);
    const { data } = await api.get<PaginationResponse<DebtOrderRow>>(
      `${basePath}/debts/orders`,
      { params: queryParams },
    );
    return data;
  },

  /**
   * Fetch customers report list with pagination
   * GET /reports/customers/list
   */
  async getCustomersReportList(
    params: ReportListParams,
  ): Promise<PaginationResponse<CustomerReportRow>> {
    const queryParams = buildListParams(params);
    const { data } = await api.get<PaginationResponse<CustomerReportRow>>(
      `${basePath}/customers/list`,
      { params: queryParams },
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
    paymentMethod?: string,
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
   * Fetch payments report summary
   */
  async getPaymentsReport(
    from: Date,
    to: Date,
    branchId?: string,
  ): Promise<PaymentsReportData> {
    const params: ReportQueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      ...(branchId && { branchId }),
    };
    const { data } = await api.get<PaymentsReportData>(`${basePath}/payments`, {
      params,
    });
    return data;
  },

  /**
   * Fetch debts report summary
   */
  async getDebtsReport(
    from: Date,
    to: Date,
    branchId?: string,
  ): Promise<DebtsReportData> {
    const params: ReportQueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      ...(branchId && { branchId }),
    };
    const { data } = await api.get<DebtsReportData>(`${basePath}/debts`, {
      params,
    });
    return data;
  },

  /**
   * Fetch customers report summary
   */
  async getCustomersReport(
    from: Date,
    to: Date,
    branchId?: string,
  ): Promise<CustomersReportData> {
    const params: ReportQueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      ...(branchId && { branchId }),
    };
    const { data } = await api.get<CustomersReportData>(
      `${basePath}/customers`,
      {
        params,
      },
    );
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
    paymentMethod?: string,
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
   * Fetch inventory report (stock movements summary)
   */
  async getInventoryReport(
    from: Date,
    to: Date,
    branchId?: string,
  ): Promise<InventoryReportData> {
    const params: ReportQueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      ...(branchId && { branchId }),
    };
    const { data } = await api.get<InventoryReportData>(
      `${basePath}/inventory`,
      { params },
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
      { params },
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
      { params },
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
    limit = 10,
  ): Promise<TopProductData[]> {
    const params: ReportQueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      limit,
      ...(branchId && { branchId }),
    };
    const { data } = await api.get<TopProductData[]>(
      `${basePath}/dashboard/top-products`,
      { params },
    );
    return data;
  },

  /**
   * Fetch financials report summary
   */
  async getFinancialsReport(
    from: Date,
    to: Date,
    branchId?: string,
  ): Promise<FinancialsReportData> {
    const params: ReportQueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      ...(branchId && { branchId }),
    };
    const { data } = await api.get<FinancialsReportData>(
      `${basePath}/financials`,
      {
        params,
      },
    );
    return data;
  },

  /**
   * Fetch products with profit data
   */
  async getProductsWithProfit(
    from: Date,
    to: Date,
    branchId?: string,
    limit = 5,
  ): Promise<ProductProfitRow[]> {
    const params: ReportQueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      limit,
      ...(branchId && { branchId }),
    };
    const { data } = await api.get<ProductProfitRow[]>(
      `${basePath}/financials/products`,
      { params },
    );
    return data;
  },

  /**
   * Fetch category revenue data
   */
  async getCategoryRevenue(
    from: Date,
    to: Date,
    branchId?: string,
  ): Promise<CategoryRevenueRow[]> {
    const params: ReportQueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      ...(branchId && { branchId }),
    };
    const { data } = await api.get<CategoryRevenueRow[]>(
      `${basePath}/financials/categories`,
      { params },
    );
    return data;
  },

  // ============================================================
  // LOYALTY REPORT ENDPOINTS
  // ============================================================

  /**
   * Fetch loyalty summary
   * GET /reports/loyalty
   */
  async getLoyaltySummary(
    params: ReportListParams,
  ): Promise<LoyaltySummaryData> {
    const queryParams = buildListParams(params);
    const { data } = await api.get<LoyaltySummaryData>(`${basePath}/loyalty`, {
      params: queryParams,
    });
    return data;
  },

  /**
   * Fetch loyalty transactions list with pagination
   * GET /reports/loyalty/transactions
   */
  async getLoyaltyTransactionsList(
    params: ReportListParams,
  ): Promise<PaginationResponse<LoyaltyTransactionReportRow>> {
    const queryParams = buildListParams(params);
    const { data } = await api.get<
      PaginationResponse<LoyaltyTransactionReportRow>
    >(`${basePath}/loyalty/transactions`, { params: queryParams });
    return data;
  },
};
