import { api } from "./api";
import type {
  DashboardSummary,
  WeeklySalesData,
  CategoryData,
  HourlyRevenueData,
  TopProductData,
} from "../types/dashboard";

/**
 * Dashboard API Client
 * Handles all dashboard-related API calls with proper error handling
 */

interface QueryParams {
  branchId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

class DashboardApiClient {
  private readonly basePath = "/reports/dashboard";

  /**
   * Fetch dashboard summary metrics
   */
  async getSummary(branchId?: string): Promise<DashboardSummary> {
    const params: QueryParams = branchId ? { branchId } : {};
    const { data } = await api.get<DashboardSummary>(
      `${this.basePath}/summary`,
      { params }
    );
    return data;
  }

  /**
   * Fetch weekly sales data for the last 7 days
   */
  async getWeeklySales(branchId?: string): Promise<WeeklySalesData[]> {
    const params: QueryParams = branchId ? { branchId } : {};
    const { data } = await api.get<WeeklySalesData[]>(
      `${this.basePath}/weekly-sales`,
      { params }
    );
    return data;
  }

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
    const response = await api.get(`${this.basePath}/sales-by-category`, {
      params,
    });
    return response.data;
  }

  /**
   * Fetch hourly revenue distribution for today
   */
  async getHourlyRevenue(branchId?: string): Promise<HourlyRevenueData[]> {
    const params: QueryParams = branchId ? { branchId } : {};
    const { data } = await api.get<HourlyRevenueData[]>(
      `${this.basePath}/hourly-revenue`,
      { params }
    );
    return data;
  }

  /**
   * Fetch top selling products
   */
  async getTopProducts(
    from: Date,
    to: Date,
    branchId?: string,
    limit = 5
  ): Promise<TopProductData[]> {
    const params: QueryParams = {
      from: from.toISOString(),
      to: to.toISOString(),
      limit,
      ...(branchId && { branchId }),
    };
    const { data } = await api.get<TopProductData[]>(
      `${this.basePath}/top-products`,
      { params }
    );
    return data;
  }
}

// Export singleton instance
export const dashboardApi = new DashboardApiClient();
