// Read-only aggregate queries backing the Dashboard page. No repository
// layer — these are single-purpose SQL reads with no domain mutation logic,
// same pattern as the raw db access in inventory.service.ts.

import type Database from "better-sqlite3";
import { OrderStatus } from "../../shared/enums";
import type {
  CategorySalesPoint,
  DashboardSummary,
  HourlyRevenuePoint,
  TopProductPoint,
  WeeklySalesPoint,
} from "../../shared/models";
import type { DateRangeInput, TopProductsInput } from "../../shared/schemas";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export class DashboardService {
  constructor(private readonly db: Database.Database) {}

  // Today's key metrics — mirrors pos-desktop's getDashboardSummary.
  summary(): DashboardSummary {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();

    const row = this.db
      .prepare<[string, string], { revenue: number; orders: number }>(
        `SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
         FROM orders
         WHERE status = ? AND createdAt >= ?`,
      )
      .get(OrderStatus.COMPLETED, startIso);

    const customersRow = this.db
      .prepare<[string, string], { count: number }>(
        `SELECT COUNT(DISTINCT customerId) as count
         FROM orders
         WHERE status = ? AND createdAt >= ? AND customerId IS NOT NULL`,
      )
      .get(OrderStatus.COMPLETED, startIso);

    const totalRevenue = row?.revenue ?? 0;
    const totalOrders = row?.orders ?? 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalCustomers: customersRow?.count ?? 0,
    };
  }

  // Last 7 days of revenue, zero-filled — mirrors getWeeklySales.
  weeklySales(): WeeklySalesPoint[] {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const rows = this.db
      .prepare<[string, string, string], { day: string; sales: number }>(
        `SELECT substr(createdAt, 1, 10) as day, SUM(total) as sales
         FROM orders
         WHERE status = ? AND createdAt >= ? AND createdAt <= ?
         GROUP BY day`,
      )
      .all(OrderStatus.COMPLETED, sevenDaysAgo.toISOString(), today.toISOString());

    const byDay = new Map(rows.map((row) => [row.day, row.sales]));

    const points: WeeklySalesPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      points.push({
        date: dateStr,
        name: WEEKDAY_NAMES[date.getDay()]!,
        sales: byDay.get(dateStr) ?? 0,
      });
    }
    return points;
  }

  // Revenue share per category within a date range — mirrors getSalesByCategory.
  salesByCategory({ from, to }: DateRangeInput): CategorySalesPoint[] {
    const rows = this.db
      .prepare<
        [string, string, string],
        { name: string; sales: number; value: number }
      >(
        `SELECT COALESCE(c.name, 'Uncategorized') as name,
                SUM(oi.lineTotal) as sales, SUM(oi.quantity) as value
         FROM order_items oi
         JOIN orders o ON o.id = oi.orderId
         LEFT JOIN products p ON p.id = oi.productId
         LEFT JOIN categories c ON c.id = p.categoryId
         WHERE o.status = ? AND o.createdAt >= ? AND o.createdAt <= ?
         GROUP BY c.id
         ORDER BY sales DESC`,
      )
      .all(OrderStatus.COMPLETED, from, to);

    return rows.map((row) => ({
      name: row.name,
      sales: row.sales,
      value: row.value,
    }));
  }

  // Today's revenue by hour, zero-filled — mirrors getHourlyRevenue.
  hourlyRevenue(): HourlyRevenuePoint[] {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const rows = this.db
      .prepare<[string, string], { hour: number; revenue: number }>(
        `SELECT CAST(substr(createdAt, 12, 2) AS INTEGER) as hour, SUM(total) as revenue
         FROM orders
         WHERE status = ? AND createdAt >= ?
         GROUP BY hour`,
      )
      .all(OrderStatus.COMPLETED, startOfDay.toISOString());

    const byHour = new Map(rows.map((row) => [row.hour, row.revenue]));

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      revenue: byHour.get(hour) ?? 0,
    }));
  }

  // Best-selling products by revenue within a date range — mirrors getTopProducts.
  topProducts({ from, to, limit }: TopProductsInput): TopProductPoint[] {
    const rows = this.db
      .prepare<
        [string, string, string, number],
        { product: string; revenue: number; sold: number }
      >(
        `SELECT oi.productName as product, SUM(oi.lineTotal) as revenue, SUM(oi.quantity) as sold
         FROM order_items oi
         JOIN orders o ON o.id = oi.orderId
         WHERE o.status = ? AND o.createdAt >= ? AND o.createdAt <= ?
         GROUP BY oi.productId
         ORDER BY revenue DESC
         LIMIT ?`,
      )
      .all(OrderStatus.COMPLETED, from, to, limit);

    return rows;
  }
}
