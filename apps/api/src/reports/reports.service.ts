import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ReportQueryDto } from './dto/report-query.dto.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sales Report - Total revenue, order count, average order value
   */
  async getSalesReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId } = query;

    const where: Prisma.OrderWhereInput = {
      tenantId,
      status: 'COMPLETED',
      createdAt: {
        gte: from,
        lte: to,
      },
      ...(branchId && { branchId }),
    };

    const aggregation = await this.prisma.order.aggregate({
      where,
      _sum: {
        total: true,
        taxAmount: true,
        subtotal: true,
        discount: true,
      },
      _count: true,
    });

    const totalRevenue = Number(aggregation._sum.total) || 0;
    const orderCount = aggregation._count || 0;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalTax: Number(aggregation._sum.taxAmount) || 0,
      totalSubtotal: Number(aggregation._sum.subtotal) || 0,
      totalDiscount: Number(aggregation._sum.discount) || 0,
      orderCount,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      dateRange: { from, to },
      branchId: branchId || null,
    };
  }

  /**
   * Payments Report - Revenue grouped by payment method
   */
  async getPaymentsReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId } = query;

    const payments = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        order: {
          tenantId,
          status: 'COMPLETED',
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const paymentBreakdown = payments.map((p) => ({
      method: p.method,
      totalAmount: Number(p._sum.amount) || 0,
      transactionCount: p._count,
    }));

    const grandTotal = paymentBreakdown.reduce(
      (sum, p) => sum + p.totalAmount,
      0,
    );

    return {
      paymentBreakdown,
      grandTotal: Number(grandTotal.toFixed(2)),
      dateRange: { from, to },
      branchId: branchId || null,
    };
  }

  /**
   * Orders Report - Order counts by status
   */
  async getOrdersReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId } = query;

    const orders = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        tenantId,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(branchId && { branchId }),
      },
      _count: true,
    });

    const ordersByStatus = orders.map((o) => ({
      status: o.status,
      count: o._count,
    }));

    const totalOrders = ordersByStatus.reduce((sum, o) => sum + o.count, 0);

    return {
      ordersByStatus,
      totalOrders,
      dateRange: { from, to },
      branchId: branchId || null,
    };
  }

  /**
   * Inventory Report - Stock movements summary
   */
  async getInventoryReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId } = query;

    const movements = await this.prisma.inventoryHistory.groupBy({
      by: ['changeType'],
      where: {
        tenantId,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(branchId && { branchId }),
      },
      _sum: {
        adjustment: true,
      },
      _count: true,
    });

    const movementsByType = movements.map((m) => ({
      changeType: m.changeType,
      totalAdjustment: Number(m._sum.adjustment) || 0,
      count: m._count,
    }));

    const totalMovements = movementsByType.reduce((sum, m) => sum + m.count, 0);

    return {
      movementsByType,
      totalMovements,
      dateRange: { from, to },
      branchId: branchId || null,
    };
  }

  /**
   * Taxes Report - Tax collected grouped by tax rate
   */
  async getTaxesReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId } = query;

    // Get tax amounts from completed order items grouped by tax rate
    const taxesByRate = await this.prisma.orderItem.groupBy({
      by: ['taxRate'],
      where: {
        order: {
          tenantId,
          status: 'COMPLETED',
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
        },
      },
      _sum: {
        taxAmount: true,
        total: true,
      },
      _count: true,
    });

    const taxBreakdown = taxesByRate.map((t) => ({
      taxRate: Number(t.taxRate),
      taxCollected: Number(t._sum.taxAmount) || 0,
      taxableAmount: Number(t._sum.total) || 0,
      itemCount: t._count,
    }));

    const totalTaxCollected = taxBreakdown.reduce(
      (sum, t) => sum + t.taxCollected,
      0,
    );

    // Also get tax names from the Tax model for reference
    const taxes = await this.prisma.tax.findMany({
      where: { tenantId },
      select: { id: true, name: true, rate: true },
    });

    return {
      taxBreakdown,
      totalTaxCollected: Number(totalTaxCollected.toFixed(2)),
      taxTypes: taxes.map((t) => ({
        id: t.id,
        name: t.name,
        rate: Number(t.rate),
      })),
      dateRange: { from, to },
      branchId: branchId || null,
    };
  }

  /**
   * Dashboard Summary - Key metrics for today
   */
  async getDashboardSummary(tenantId: string, branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: Prisma.OrderWhereInput = {
      tenantId,
      status: 'COMPLETED',
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
      ...(branchId && { branchId }),
    };

    const [orders, orderCount] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _sum: {
          total: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalRevenue = Number(orders._sum.total) || 0;

    // Get unique customers (assuming userId on orders)
    const uniqueCustomers = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        ...where,
        userId: { not: null },
      },
    });

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders: orderCount,
      averageOrderValue:
        orderCount > 0 ? Number((totalRevenue / orderCount).toFixed(2)) : 0,
      totalCustomers: uniqueCustomers.length,
    };
  }

  /**
   * Weekly Sales - Last 7 days of sales data
   */
  async getWeeklySales(tenantId: string, branchId?: string) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: {
          gte: sevenDaysAgo,
          lte: today,
        },
        ...(branchId && { branchId }),
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    // Group by day
    const salesByDay = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      salesByDay.set(dateStr, 0);
    }

    orders.forEach((order) => {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      const currentTotal = salesByDay.get(dateStr) || 0;
      salesByDay.set(dateStr, currentTotal + Number(order.total));
    });

    return Array.from(salesByDay.entries()).map(([date, sales]) => ({
      date,
      name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      sales: Number(sales.toFixed(2)),
    }));
  }

  /**
   * Sales by Category - Revenue breakdown by category
   */
  async getSalesByCategory(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId } = query;

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          tenantId,
          status: 'COMPLETED',
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
        },
      },
      select: {
        total: true,
        quantity: true,
        product: {
          select: {
            categoryId: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Group by category
    const categoryMap = new Map<
      string,
      { name: string; sales: number; value: number }
    >();

    orderItems.forEach((item) => {
      const categoryId = item.product.categoryId || 'uncategorized';
      const categoryName = item.product.category?.name || 'Uncategorized';
      const itemTotal = Number(item.total);

      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId)!;
        existing.sales += itemTotal;
        existing.value += Number(item.quantity);
      } else {
        categoryMap.set(categoryId, {
          name: categoryName,
          sales: itemTotal,
          value: Number(item.quantity),
        });
      }
    });

    return Array.from(categoryMap.values()).map((cat) => ({
      name: cat.name,
      sales: Number(cat.sales.toFixed(2)),
      value: cat.value,
    }));
  }

  /**
   * Hourly Revenue - Revenue distribution by hour for today
   */
  async getHourlyRevenue(tenantId: string, branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        ...(branchId && { branchId }),
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    // Initialize all hours with 0
    const revenueByHour = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      revenueByHour.set(i, 0);
    }

    // Group by hour
    orders.forEach((order) => {
      const hour = order.createdAt.getHours();
      const currentRevenue = revenueByHour.get(hour) || 0;
      revenueByHour.set(hour, currentRevenue + Number(order.total));
    });

    return Array.from(revenueByHour.entries()).map(([hour, revenue]) => ({
      hour,
      revenue: Number(revenue.toFixed(2)),
    }));
  }

  /**
   * Top Products - Best selling products by revenue
   */
  async getTopProducts(tenantId: string, query: ReportQueryDto, limit = 5) {
    const { from, to, branchId } = query;

    const products = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          tenantId,
          status: 'COMPLETED',
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
        },
      },
      _sum: {
        total: true,
        quantity: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: limit,
    });

    // Fetch product details
    const productIds = products.map((p) => p.productId);
    const productDetails = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const productMap = new Map(productDetails.map((p) => [p.id, p.name]));

    return products.map((p) => ({
      product: productMap.get(p.productId) || 'Unknown Product',
      revenue: Number(p._sum.total) || 0,
      sold: Number(p._sum.quantity) || 0,
    }));
  }
}
