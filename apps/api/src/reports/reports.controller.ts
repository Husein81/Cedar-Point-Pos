import {
  Controller,
  Get,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '@repo/types';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ReportsService } from './reports.service.js';
import {
  reportQuerySchema,
  type ReportQueryDto,
} from './dto/report-query.dto.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  private parseQuery(query: Record<string, unknown>): ReportQueryDto {
    const result = reportQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((e) => e.message).join(', '),
      );
    }
    return result.data;
  }

  // ============================================================
  // NEW LIST ENDPOINTS (TABLE DATA)
  // ============================================================

  /**
   * Sales Orders List - Paginated order rows for tables
   * GET /reports/sales/orders?from=2024-01-01&to=2024-12-31&branchId=optional&page=1&pageSize=25
   *
   * Supports:
   * - Filters: branchId, orderType, paymentMethod, status, userId, search
   * - Sorting: sortBy (createdAt, completedAt, total, subtotal, discount, orderNumber), sortDir (asc/desc)
   * - Pagination: page, pageSize
   */
  @Get('sales/orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getSalesOrdersList(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getSalesOrdersList(user.tenantId, parsedQuery);
  }

  /**
   * Payment Transactions List - Paginated payment rows for tables
   * GET /reports/payments/transactions?from=2024-01-01&to=2024-12-31&branchId=optional&page=1&pageSize=25
   *
   * Supports:
   * - Filters: branchId, paymentMethod, userId, search
   * - Sorting: sortBy (paidAt, amount, method), sortDir (asc/desc)
   * - Pagination: page, pageSize
   */
  @Get('payments/transactions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getPaymentTransactionsList(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getPaymentTransactionsList(
      user.tenantId,
      parsedQuery,
    );
  }

  /**
   * Inventory Movements List - Paginated inventory history rows for tables
   * GET /reports/inventory/movements?from=2024-01-01&to=2024-12-31&branchId=optional&page=1&pageSize=25
   *
   * Supports:
   * - Filters: branchId, changeType, userId, search
   * - Sorting: sortBy (createdAt, changeType, adjustment), sortDir (asc/desc)
   * - Pagination: page, pageSize
   */
  @Get('inventory/movements')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getInventoryMovementsList(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getInventoryMovementsList(
      user.tenantId,
      parsedQuery,
    );
  }

  /**
   * Top Products Report List - Paginated product performance rows for tables
   * GET /reports/products/top?from=2024-01-01&to=2024-12-31&branchId=optional&limit=10
   *
   * Supports:
   * - Filters: branchId, limit
   * - Sorting: sortBy (revenue, qtySold, productName), sortDir (asc/desc)
   * - Pagination: page, pageSize (or limit for traditional top-N queries)
   */
  @Get('products/top')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getTopProductsReportList(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getTopProductsReportList(
      user.tenantId,
      parsedQuery,
    );
  }

  // ============================================================
  // EXISTING SUMMARY ENDPOINTS (UNCHANGED)
  // ============================================================

  /**
   * Sales Report - Total revenue, order count, average order value
   * GET /reports/sales?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('sales')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getSalesReport(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getSalesReport(user.tenantId, parsedQuery);
  }

  /**
   * Debts Report - Total debts, unpaid orders count, and top debtor
   * GET /reports/debts?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('debts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getDebtsReport(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getDebtsReport(user.tenantId, parsedQuery);
  }

  /**
   * Debts Orders List - Paginated list of pending orders (debts)
   * GET /reports/debts/orders?from=2024-01-01&to=2024-12-31&branchId=optional&page=1&pageSize=10
   */
  @Get('debts/orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getDebtsOrdersList(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getDebtsOrdersList(user.tenantId, parsedQuery);
  }

  /**
   * Customer Reports Summary - Total customers, active customers, top customer
   * GET /reports/customers?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('customers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getCustomersReport(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getCustomersReport(user.tenantId, parsedQuery);
  }

  /**
   * Customer Reports List - Paginated customer rows with aggregated data
   * GET /reports/customers/list?from=2024-01-01&to=2024-12-31&branchId=optional&page=1&pageSize=25
   */
  @Get('customers/list')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getCustomersReportList(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getCustomersReportList(
      user.tenantId,
      parsedQuery,
    );
  }

  /**
   * Financials Report Summary - Revenue, profits, debts, top profit product
   * GET /reports/financials?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('financials')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getFinancialsReport(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getFinancialsReport(user.tenantId, parsedQuery);
  }

  /**
   * Products with Profit - Top N products by profit
   * GET /reports/financials/products?from=2024-01-01&to=2024-12-31&branchId=optional&limit=5
   */
  @Get('financials/products')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getProductsWithProfit(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getProductsWithProfit(user.tenantId, parsedQuery);
  }

  /**
   * Category Revenue - Revenue and profit by category
   * GET /reports/financials/categories?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('financials/categories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getCategoryRevenue(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getCategoryRevenue(user.tenantId, parsedQuery);
  }

  /**
   * Top Selling Products - Top 10 by revenue
   * GET /reports/products/top-sellers?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('products/top-sellers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getTopSellingProducts(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getTopSellingProducts(user.tenantId, parsedQuery);
  }

  /**
   * Most Ordered Products - Top 5 by quantity
   * GET /reports/products/most-ordered?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('products/most-ordered')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getMostOrderedProducts(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getMostOrderedProducts(user.tenantId, parsedQuery);
  }

  /**
   * Least Sold Products - Bottom 5 by quantity
   * GET /reports/products/least-sold?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('products/least-sold')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getLeastSoldProducts(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getLeastSoldProducts(user.tenantId, parsedQuery);
  }

  /**
   * Payments Report - Revenue grouped by payment method
   * GET /reports/payments?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('payments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getPaymentsReport(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getPaymentsReport(user.tenantId, parsedQuery);
  }

  /**
   * Payment Transactions List - Individual payment records with pagination
   * GET /reports/payments/transactions?from=2024-01-01&to=2024-12-31&page=1&pageSize=25&branchId=optional
   */
  @Get('payments/transactions')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getPaymentTransactions(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    const page = query.page ? Number(query.page) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 25;

    return this.reportsService.getPaymentTransactionsList(user.tenantId, {
      ...parsedQuery,
      page,
      pageSize,
    });
  }

  /**
   * Orders Report - Order counts by status
   * GET /reports/orders?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getOrdersReport(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getOrdersReport(user.tenantId, parsedQuery);
  }

  /**
   * Inventory Report - Stock movements summary
   * GET /reports/inventory?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('inventory')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getInventoryReport(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getInventoryReport(user.tenantId, parsedQuery);
  }

  // ============================================================
  // DASHBOARD ENDPOINTS (UNCHANGED)
  // ============================================================

  /**
   * Dashboard Summary - Key metrics for today
   * GET /reports/dashboard/summary?branchId=optional
   */
  @Get('dashboard/summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getDashboardSummary(
    @Req() req: Request,
    @Query('branchId') branchId?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.reportsService.getDashboardSummary(user.tenantId, branchId);
  }

  /**
   * Weekly Sales - Last 7 days of sales data
   * GET /reports/dashboard/weekly-sales?branchId=optional
   */
  @Get('dashboard/weekly-sales')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getWeeklySales(
    @Req() req: Request,
    @Query('branchId') branchId?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.reportsService.getWeeklySales(user.tenantId, branchId);
  }

  /**
   * Sales by Category - Revenue breakdown by category
   * GET /reports/dashboard/sales-by-category?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('dashboard/sales-by-category')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getSalesByCategory(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getSalesByCategory(user.tenantId, parsedQuery);
  }

  /**
   * Hourly Revenue - Revenue distribution by hour for today
   * GET /reports/dashboard/hourly-revenue?branchId=optional
   */
  @Get('dashboard/hourly-revenue')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getHourlyRevenue(
    @Req() req: Request,
    @Query('branchId') branchId?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.reportsService.getHourlyRevenue(user.tenantId, branchId);
  }

  /**
   * Top Products - Best selling products (dashboard version)
   * GET /reports/dashboard/top-products?from=2024-01-01&to=2024-12-31&branchId=optional&limit=5
   */
  @Get('dashboard/top-products')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getTopProducts(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    const limit = query.limit ? Number(query.limit) : 5;
    return this.reportsService.getTopProducts(
      user.tenantId,
      parsedQuery,
      limit,
    );
  }
}
