import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ReportQueryDto,
  ALLOWED_SORT_FIELDS,
  type PaginatedResponse,
  type PaginationMeta,
} from './dto/report-query.dto.js';
import { Prisma } from '../../generated/prisma/client.js';

// ============================================================
// Response Row Types (exported for controller return type inference)
// ============================================================

export interface SalesOrderRow {
  id: string;
  orderNumber: string | null;
  type: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  branch: { id: string; name: string };
  cashier: { id: string; name: string; username: string } | null;
  subtotal: number;
  discount: number;
  total: number;
  paymentsSummary: {
    methods: Array<{ method: string; amount: number; currencyCode: string | null }>;
    totalPaid: number;
  };
}

export interface PaymentTransactionRow {
  id: string;
  paidAt: Date;
  method: string;
  currencyCode: string | null;
  amount: number;
  exchangeRate: number | null;
  order: {
    id: string;
    orderNumber: string | null;
    branch: { id: string; name: string };
    cashier: { id: string; name: string; username: string } | null;
    type: string;
    status: string;
  };
}

export interface InventoryMovementRow {
  id: string;
  createdAt: Date;
  changeType: string;
  beforeStock: number;
  afterStock: number;
  adjustment: number;
  reason: string | null;
  referenceId: string | null;
  referenceType: string | null;
  branch: { id: string; name: string };
  user: { id: string; name: string; username: string };
  product: { id: string; name: string };
}

export interface TopProductRow {
  productId: string;
  productName: string;
  categoryName: string | null;
  qtySold: number;
  revenue: number;
  avgUnitPrice: number;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Builds pagination meta from count and query params
 */
function buildPaginationMeta(
  totalItems: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize) || 1,
  };
}

/**
 * Validates sortBy field against allowed fields
 */
function validateSortBy(
  sortBy: string | undefined,
  allowedFields: readonly string[],
  endpointName: string,
): void {
  if (sortBy && !allowedFields.includes(sortBy)) {
    throw new BadRequestException(
      `Invalid sortBy field '${sortBy}' for ${endpointName}. Allowed: ${allowedFields.join(', ')}`,
    );
  }
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) { }

  // ============================================================
  // NEW LIST ENDPOINTS
  // ============================================================

  /**
   * Sales Orders List - Paginated order rows with payments summary
   * GET /reports/sales/orders
   *
   * For date filtering:
   * - Uses createdAt as the primary filter for consistency with existing summary endpoints
   * - completedAt is included in response for display purposes
   */
  async getSalesOrdersList(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<PaginatedResponse<SalesOrderRow>> {
    const {
      from,
      to,
      branchId,
      orderType,
      paymentMethod,
      status,
      userId,
      search,
      sortBy,
      sortDir = 'desc',
      page = 1,
      pageSize = 25,
    } = query;

    // Validate sortBy
    validateSortBy(sortBy, ALLOWED_SORT_FIELDS.salesOrders, 'sales orders');

    // Build where clause
    const where: Prisma.OrderWhereInput = {
      tenantId,
      createdAt: {
        gte: from,
        lte: to,
      },
      ...(branchId && { branchId }),
      ...(orderType && { type: orderType }),
      ...(status && { status }),
      ...(userId && { userId }),
      // Filter by payment method via payments relation
      ...(paymentMethod && {
        payments: {
          some: { method: paymentMethod },
        },
      }),
      // Search by orderNumber
      ...(search && {
        orderNumber: { contains: search, mode: 'insensitive' as const },
      }),
    };

    // Build orderBy
    const orderBy: Prisma.OrderOrderByWithRelationInput = sortBy
      ? { [sortBy]: sortDir }
      : { createdAt: sortDir };

    // Execute count and list queries in parallel
    const [totalItems, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          orderNumber: true,
          type: true,
          status: true,
          createdAt: true,
          completedAt: true,
          subtotal: true,
          discount: true,
          total: true,
          branch: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true, username: true },
          },
          payments: {
            select: {
              method: true,
              amount: true,
              currencyCode: true,
            },
          },
        },
      }),
    ]);

    // Transform orders to response shape
    const data: SalesOrderRow[] = orders.map((order) => {
      // Aggregate payments by method
      const paymentsByMethod = new Map<
        string,
        { method: string; amount: number; currencyCode: string | null }
      >();
      let totalPaid = 0;

      order.payments.forEach((p) => {
        const amount = Number(p.amount);
        totalPaid += amount;
        const existing = paymentsByMethod.get(p.method);
        if (existing) {
          existing.amount += amount;
        } else {
          paymentsByMethod.set(p.method, {
            method: p.method,
            amount,
            currencyCode: p.currencyCode,
          });
        }
      });

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        status: order.status,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
        branch: order.branch,
        cashier: order.user,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount) || 0,
        total: Number(order.total),
        paymentsSummary: {
          methods: Array.from(paymentsByMethod.values()),
          totalPaid,
        },
      };
    });

    return {
      data,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  /**
   * Payment Transactions List - Paginated payment rows
   * GET /reports/payments/transactions
   *
   * Filters by paidAt date range for payment-specific filtering
   */
  async getPaymentTransactionsList(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<PaginatedResponse<PaymentTransactionRow>> {
    const {
      from,
      to,
      branchId,
      paymentMethod,
      userId,
      search,
      sortBy,
      sortDir = 'desc',
      page = 1,
      pageSize = 25,
    } = query;

    // Validate sortBy
    validateSortBy(
      sortBy,
      ALLOWED_SORT_FIELDS.paymentTransactions,
      'payment transactions',
    );

    // Build where clause
    const where: Prisma.PaymentWhereInput = {
      order: {
        tenantId,
        ...(branchId && { branchId }),
        ...(userId && { userId }),
        // Search by order number
        ...(search && {
          orderNumber: { contains: search, mode: 'insensitive' as const },
        }),
      },
      paidAt: {
        gte: from,
        lte: to,
      },
      ...(paymentMethod && { method: paymentMethod }),
    };

    // Build orderBy
    const orderBy: Prisma.PaymentOrderByWithRelationInput = sortBy
      ? { [sortBy]: sortDir }
      : { paidAt: sortDir };

    // Execute count and list queries in parallel
    const [totalItems, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          paidAt: true,
          method: true,
          currencyCode: true,
          amount: true,
          exchangeRate: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              type: true,
              status: true,
              branch: {
                select: { id: true, name: true },
              },
              user: {
                select: { id: true, name: true, username: true },
              },
            },
          },
        },
      }),
    ]);

    // Transform to response shape
    const data: PaymentTransactionRow[] = payments.map((p) => ({
      id: p.id,
      paidAt: p.paidAt,
      method: p.method,
      currencyCode: p.currencyCode,
      amount: Number(p.amount),
      exchangeRate: p.exchangeRate ? Number(p.exchangeRate) : null,
      order: {
        id: p.order.id,
        orderNumber: p.order.orderNumber,
        branch: p.order.branch,
        cashier: p.order.user,
        type: p.order.type,
        status: p.order.status,
      },
    }));

    return {
      data,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  /**
   * Inventory Movements List - Paginated inventory history rows
   * GET /reports/inventory/movements
   */
  async getInventoryMovementsList(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<PaginatedResponse<InventoryMovementRow>> {
    const {
      from,
      to,
      branchId,
      changeType,
      userId,
      search,
      sortBy,
      sortDir = 'desc',
      page = 1,
      pageSize = 25,
    } = query;

    // Validate sortBy
    validateSortBy(
      sortBy,
      ALLOWED_SORT_FIELDS.inventoryMovements,
      'inventory movements',
    );

    // Build where clause
    const where: Prisma.InventoryHistoryWhereInput = {
      tenantId,
      createdAt: {
        gte: from,
        lte: to,
      },
      ...(branchId && { branchId }),
      ...(changeType && { changeType }),
      ...(userId && { userId }),
      // Search by product name
      ...(search && {
        product: {
          name: { contains: search, mode: 'insensitive' as const },
        },
      }),
    };

    // Build orderBy
    const orderBy: Prisma.InventoryHistoryOrderByWithRelationInput = sortBy
      ? { [sortBy]: sortDir }
      : { createdAt: sortDir };

    // Execute count and list queries in parallel
    const [totalItems, movements] = await Promise.all([
      this.prisma.inventoryHistory.count({ where }),
      this.prisma.inventoryHistory.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          changeType: true,
          beforeStock: true,
          afterStock: true,
          adjustment: true,
          reason: true,
          referenceId: true,
          referenceType: true,
          branch: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true, username: true },
          },
          product: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    // Transform to response shape
    const data: InventoryMovementRow[] = movements.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      changeType: m.changeType,
      beforeStock: Number(m.beforeStock),
      afterStock: Number(m.afterStock),
      adjustment: Number(m.adjustment),
      reason: m.reason,
      referenceId: m.referenceId,
      referenceType: m.referenceType,
      branch: m.branch,
      user: m.user,
      product: m.product,
    }));

    return {
      data,
      meta: buildPaginationMeta(totalItems, page, pageSize),
    };
  }

  /**
   * Top Products Report List - Paginated product performance rows
   * GET /reports/products/top
   *
   * Returns products ranked by revenue with pagination support
   */
  async getTopProductsReportList(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<PaginatedResponse<TopProductRow>> {
    const {
      from,
      to,
      branchId,
      sortBy,
      sortDir = 'desc',
      page = 1,
      pageSize = 25,
      limit,
    } = query;

    // Validate sortBy (if provided as column names we use internally)
    if (sortBy) {
      validateSortBy(sortBy, ALLOWED_SORT_FIELDS.topProducts, 'top products');
    }

    // Use limit if provided, otherwise use pageSize
    const effectiveLimit = limit ?? pageSize;

    // Get aggregated order items grouped by productId
    // Note: Prisma groupBy doesn't support pagination well, so we fetch all and paginate in memory
    // For production with large datasets, consider raw SQL or a materialized view
    const groupedProducts = await this.prisma.orderItem.groupBy({
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
    });

    // Fetch product details with categories
    const productIds = groupedProducts.map((p) => p.productId);
    const productDetails = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        category: {
          select: { name: true },
        },
      },
    });

    const productMap = new Map(
      productDetails.map((p) => [
        p.id,
        { name: p.name, categoryName: p.category?.name ?? null },
      ]),
    );

    // Build full result set
    let results: TopProductRow[] = groupedProducts.map((p) => {
      const details = productMap.get(p.productId);
      const revenue = Number(p._sum.total) || 0;
      const qtySold = Number(p._sum.quantity) || 0;
      return {
        productId: p.productId,
        productName: details?.name || 'Unknown Product',
        categoryName: details?.categoryName ?? null,
        qtySold,
        revenue,
        avgUnitPrice: qtySold > 0 ? revenue / qtySold : 0,
      };
    });

    // Sort results
    const sortField = sortBy || 'revenue';
    const sortMultiplier = sortDir === 'asc' ? 1 : -1;
    results.sort((a, b) => {
      const aVal = a[sortField as keyof TopProductRow];
      const bVal = b[sortField as keyof TopProductRow];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * sortMultiplier;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * sortMultiplier;
      }
      return 0;
    });

    const totalItems = results.length;

    // Apply limit or pagination
    if (limit) {
      // When limit is specified, just take top N items
      results = results.slice(0, effectiveLimit);
    } else {
      // Standard pagination
      const startIndex = (page - 1) * pageSize;
      results = results.slice(startIndex, startIndex + pageSize);
    }

    return {
      data: results,
      meta: buildPaginationMeta(totalItems, page, limit ?? pageSize),
    };
  }

  // ============================================================
  // EXISTING SUMMARY/DASHBOARD ENDPOINTS (UNCHANGED)
  // ============================================================

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
