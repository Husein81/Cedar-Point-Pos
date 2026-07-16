export interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
}

export interface WeeklySalesData {
  date: string;
  name: string;
  sales: number;
}

export interface CategoryData {
  name: string;
  value: number;
  sales: number;
}

export interface HourlyRevenueData {
  hour: number;
  revenue: number;
}

export interface TopProductData {
  product: string;
  sold: number;
  revenue: number;
}
