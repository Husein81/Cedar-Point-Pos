import type {
  CategoryData,
  DashboardSummary,
  HourlyRevenueData,
  TopProductData,
  WeeklySalesData,
} from "../types/dashboard";
import { api } from "./api";

interface QueryParams {
  branchId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

const basePath = "/reports/dashboard";
export const dashboardApi = {
  /**
   * Fetch dashboard summary metrics
   */
  async getSummary(branchId?: string): Promise<DashboardSummary> {
    const params: QueryParams = branchId ? { branchId } : {};
    const { data } = await api.get<DashboardSummary>(`${basePath}/summary`, {
      params,
    });
    return data;
  },
  /**
   * Fetch weekly sales data for the last 7 days
   */
  async getWeeklySales(branchId?: string): Promise<WeeklySalesData[]> {
    const params: QueryParams = branchId ? { branchId } : {};
    const { data } = await api.get<WeeklySalesData[]>(
      `${basePath}/weekly-sales`,
      { params }
    );
    return data;
  },

  /**
   * Fetch sales breakdown by category
   */
  async getSalesByCategory(
    from: Date,
    to: Date,
    branchId?: string
  ): Promise<CategoryData[]> {
    const params: QueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      ...(branchId && { branchId }),
    };
    const response = await api.get(`${basePath}/sales-by-category`, {
      params,
    });
    return response.data;
  },

  /**
   * Fetch hourly revenue distribution for today
   */
  async getHourlyRevenue(branchId?: string): Promise<HourlyRevenueData[]> {
    const params: QueryParams = branchId ? { branchId } : {};
    const { data } = await api.get<HourlyRevenueData[]>(
      `${basePath}/hourly-revenue`,
      { params }
    );
    return data;
  },

  /**
   * Fetch top selling products
   */
  getTopProducts: async (
    from: Date,
    to: Date,
    branchId?: string,
    limit = 5
  ): Promise<TopProductData[]> => {
    const params: QueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      limit,
      ...(branchId && { branchId }),
    };
    const { data } = await api.get<TopProductData[]>(
      `${basePath}/top-products`,
      { params }
    );
    return data;
  },
};
