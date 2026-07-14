/**
 * Dashboard Type Definitions
 * Shapes mirror the API responses under GET /reports/dashboard/*
 * (see apps/api/src/modules/reports/reports.service.ts).
 */

export interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
}

export interface WeeklySalesData {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** Short weekday label, e.g. "Mon" */
  name: string;
  sales: number;
}

export interface CategoryData {
  name: string;
  /** Units sold in the category */
  value: number;
  /** Revenue for the category */
  sales: number;
}

export interface HourlyRevenueData {
  /** Hour of day, 0–23 */
  hour: number;
  revenue: number;
}

export interface TopProductData {
  product: string;
  sold: number;
  revenue: number;
}
