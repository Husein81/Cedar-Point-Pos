/**
 * Dashboard Type Definitions
 * Contains all type definitions for the dashboard module
 */

export interface DashboardSummary {
  todaySales: number;
  orderCount: number;
  avgOrderValue: number;
  activeTables: number;
  totalTables: number;
}

export interface WeeklySalesData {
  name: string;
  sales: number;
  orders: number;
}

export interface CategoryData {
  name: string;
  value: number;
  sales: number;
}

export interface HourlyRevenueData {
  hour: string;
  revenue: number;
}

export interface TopProductData {
  product: string;
  sold: number;
  revenue: number;
}

export interface DashboardFilters {
  branchId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}
