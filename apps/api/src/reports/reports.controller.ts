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
  constructor(private readonly reportsService: ReportsService) {}

  private parseQuery(query: Record<string, unknown>): ReportQueryDto {
    const result = reportQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((e) => e.message).join(', '),
      );
    }
    return result.data;
  }

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

  /**
   * Taxes Report - Tax collected grouped by tax type
   * GET /reports/taxes?from=2024-01-01&to=2024-12-31&branchId=optional
   */
  @Get('taxes')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getTaxesReport(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    const user = req.user as { tenantId: string };
    const parsedQuery = this.parseQuery(query);
    return this.reportsService.getTaxesReport(user.tenantId, parsedQuery);
  }

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
   * Top Products - Best selling products
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
