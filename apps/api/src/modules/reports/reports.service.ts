import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ReportQueryDto,
  ALLOWED_SORT_FIELDS,
  type PaginationMeta,
} from './dto/report-query.dto.js';
import {
  Prisma,
  OrderType,
  OrderStatus,
  PaymentStatus,
} from '../../generated/prisma/client.js';
import { PaginationResponse } from '@repo/types';

// ============================================================
// Debt semantics on the two-axis status model:
// - full debt: committed credit sales that took no money yet
// - partial debt: any non-cancelled order that took partial payment
// ============================================================

const FULL_DEBT_WHERE = {
  status: OrderStatus.PLACED,
  paymentStatus: PaymentStatus.UNPAID,
} satisfies Prisma.OrderWhereInput;

const PARTIAL_DEBT_WHERE = {
  paymentStatus: PaymentStatus.PARTIALLY_PAID,
  status: { not: OrderStatus.CANCELLED },
} satisfies Prisma.OrderWhereInput;

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
    methods: Array<{
      method: string;
      amount: number;
      currencyCode: string | null;
    }>;
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

export interface DebtOrderRow {
  id: string;
  orderNumber: string | null;
  createdAt: Date;
  branch: { id: string; name: string };
  type: string;
  subtotal: number;
  discount: number;
  total: number;
  customer: { id: string; name: string } | null;
  cashier: { id: string; name: string; username: string } | null;
}

export interface CustomerReportRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  ordersCount: number;
  totalSpent: number;
  outstandingDebt: number;
  lastOrderDate: Date | null;
}

export interface ProductProfitRow {
  productId: string;
  productName: string;
  categoryName: string | null;
  revenue: number;
  profit: number;
  margin: number;
  qtySold: number;
}

export interface CategoryRevenueRow {
  categoryId: string;
  categoryName: string;
  revenue: number;
  profit: number;
}

export interface LoyaltySummaryRow {
  totalAccounts: number;
  totalPointsInCirculation: number;
  totalLifetimeEarned: number;
  totalLifetimeRedeemed: number;
  totalLifetimeRestored: number;
  totalLifetimeReversed: number;
  totalLifetimeAdjusted: number;
  transactionsInPeriod: number;
}

export interface LoyaltyTransactionRow {
  id: string;
  createdAt: Date;
  type: string;
  direction: string;
  points: number;
  moneyAmount: number | null;
  balanceAfter: number;
  reason: string | null;
  customer: { id: string; name: string } | null;
  order: { id: string } | null;
  refund: { id: string } | null;
  actorUser: { id: string; name: string } | null;
}

/**
 * Builds pagination meta from count and query params
 */
function buildPagination(
  totalCount: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    totalCount,
    totalPages: Math.ceil(totalCount / limit) || 1,
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
  constructor(private readonly prisma: PrismaService) {}
  async getSalesOrdersList(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<PaginationResponse<SalesOrderRow>> {
    const {
      from,
      to,
      branchId,
      shiftId,
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
      ...(shiftId && { shiftId }),
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
        id: { contains: search, mode: 'insensitive' as const },
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
          type: true,
          status: true,
          createdAt: true,
          completedAt: true,
          subtotal: true,
          discount: true,
          total: true,
          orderNumber: true,
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
      pagination: buildPagination(totalItems, page, pageSize),
    };
  }

  /**
   * Inventory Movements List - Paginated inventory history rows
   * GET /reports/inventory/movements
   */
  async getInventoryMovementsList(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<PaginationResponse<InventoryMovementRow>> {
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
      pagination: buildPagination(totalItems, page, pageSize),
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
  ): Promise<PaginationResponse<TopProductRow>> {
    const {
      from,
      to,
      branchId,
      shiftId,
      sortBy,
      sortDir = 'desc',
      page = 1,
      pageSize = 25,
      limit,
      categoryId,
    } = query;

    // Validate sortBy (if provided as column names we use internally)
    if (sortBy) {
      validateSortBy(sortBy, ALLOWED_SORT_FIELDS.topProducts, 'top products');
    }

    // Use limit if provided, otherwise use pageSize
    const effectiveLimit = limit ?? pageSize;

    const groupedProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          tenantId,
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
        },
        ...(categoryId && {
          product: {
            categoryId,
          },
        }),
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
      pagination: buildPagination(totalItems, page, limit ?? pageSize),
    };
  }

  // ============================================================
  // EXISTING SUMMARY/DASHBOARD ENDPOINTS (UNCHANGED)
  // ============================================================

  /**
   * Sales Report - Total revenue, order count, average order value, and best order type
   */
  async getSalesReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId, shiftId } = query;

    // Fetch tenant business type to determine allowed order types
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessType: true },
    });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Define allowed order types based on business type
    // RETAIL: Compare RETAIL and DELIVERY only
    // RESTAURANT: Compare DINE_IN, TAKEAWAY, and DELIVERY
    const allowedOrderTypes: OrderType[] =
      tenant.businessType === 'RETAIL'
        ? [OrderType.RETAIL, OrderType.DELIVERY]
        : [OrderType.DINE_IN, OrderType.TAKEAWAY, OrderType.DELIVERY];

    const where: Prisma.OrderWhereInput = {
      tenantId,
      status: OrderStatus.COMPLETED,
      createdAt: {
        gte: from,
        lte: to,
      },
      ...(branchId && { branchId }),
      ...(shiftId && { shiftId }),
    };

    // Run aggregation and order type groupBy in parallel
    const [aggregation, ordersByType] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _sum: {
          total: true,
          subtotal: true,
          discount: true,
        },
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['type'],
        where: {
          ...where,
          type: { in: allowedOrderTypes }, // Filter by business-type-specific order types
        },
        _count: true,
      }),
    ]);

    const totalRevenue = Number(aggregation._sum.total) || 0;
    const orderCount = aggregation._count || 0;

    // Calculate revenue from PARTIALLY_PAID orders (only the paid portion)
    const partiallyPaidOrders = await this.prisma.order.findMany({
      where: {
        tenantId,
        ...PARTIAL_DEBT_WHERE,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(branchId && { branchId }),
        ...(shiftId && { shiftId }),
      },
      include: {
        payments: true,
      },
    });

    const partiallyPaidRevenue = partiallyPaidOrders.reduce((sum, order) => {
      const totalPaid = order.payments.reduce(
        (pSum, payment) => pSum + Number(payment.amount),
        0,
      );
      return sum + totalPaid;
    }, 0);

    const combinedRevenue = totalRevenue + partiallyPaidRevenue;
    const combinedOrderCount = orderCount + partiallyPaidOrders.length;
    const averageOrderValue =
      combinedOrderCount > 0 ? combinedRevenue / combinedOrderCount : 0;

    // Determine best order type (most frequent)
    let bestOrderType: string | null = null;
    let maxCount = 0;

    for (const group of ordersByType) {
      // Prisma groupBy _count represents the total count of grouped items
      const count =
        typeof group._count === 'number'
          ? group._count
          : ((group._count as Record<string, number>)?._all ?? 0);
      if (count > maxCount) {
        maxCount = count;
        bestOrderType = group.type;
      }
    }

    return {
      totalRevenue: Number(combinedRevenue.toFixed(2)),
      totalSubtotal: Number(aggregation._sum.subtotal) || 0,
      totalDiscount: Number(aggregation._sum.discount) || 0,
      orderCount: combinedOrderCount,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      bestOrderType, // New: Most frequent order type based on business type
      dateRange: { from, to },
      branchId: branchId || null,
    };
  }

  /**
   * Debts Report - Total debts, unpaid orders count, and top debtor
   */
  async getDebtsReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId, shiftId } = query;

    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...FULL_DEBT_WHERE, // committed credit sales that took no payment
      createdAt: {
        gte: from,
        lte: to,
      },
      ...(branchId && { branchId }),
      ...(shiftId && { shiftId }),
    };

    // Get aggregated totals
    const aggregation = await this.prisma.order.aggregate({
      where,
      _sum: {
        total: true,
      },
      _count: true,
    });

    const totalDebts = Number(aggregation._sum.total) || 0;
    const unpaidOrdersCount = aggregation._count || 0;

    // Calculate debts from PARTIALLY_PAID orders (only the unpaid portion)
    const partiallyPaidOrders = await this.prisma.order.findMany({
      where: {
        tenantId,
        ...PARTIAL_DEBT_WHERE,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(branchId && { branchId }),
        ...(shiftId && { shiftId }),
      },
      include: {
        payments: true,
      },
    });

    const partiallyPaidDebts = partiallyPaidOrders.reduce((sum, order) => {
      const totalPaid = order.payments.reduce(
        (pSum, payment) => pSum + Number(payment.amount),
        0,
      );
      const unpaid = Number(order.total) - totalPaid;
      return sum + unpaid;
    }, 0);

    const combinedDebts = totalDebts + partiallyPaidDebts;
    const combinedUnpaidCount = unpaidOrdersCount + partiallyPaidOrders.length;

    // Find top debtor (customer with highest total debt)
    // Include both PENDING and PARTIALLY_PAID orders
    const ordersByCustomer = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: {
        tenantId,
        OR: [FULL_DEBT_WHERE, PARTIAL_DEBT_WHERE],
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(branchId && { branchId }),
        ...(shiftId && { shiftId }),
        customerId: { not: null }, // Only orders with customers
      },
      _sum: {
        total: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: 1, // Get only the top debtor
    });

    let topDebtorName: string | null = null;
    let topDebtorAmount = 0;

    if (ordersByCustomer.length > 0 && ordersByCustomer[0].customerId) {
      const topDebtorId = ordersByCustomer[0].customerId;

      // For partially paid orders of this customer, calculate actual debt
      const customerPartialOrders = partiallyPaidOrders.filter(
        (o) => o.customerId === topDebtorId,
      );
      const customerPartialDebt = customerPartialOrders.reduce((sum, order) => {
        const totalPaid = order.payments.reduce(
          (pSum, payment) => pSum + Number(payment.amount),
          0,
        );
        return sum + (Number(order.total) - totalPaid);
      }, 0);

      // Get PENDING orders total for this customer
      const customerPendingOrders = await this.prisma.order.aggregate({
        where: {
          customerId: topDebtorId,
          ...FULL_DEBT_WHERE,
          createdAt: { gte: from, lte: to },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
        },
        _sum: { total: true },
      });

      topDebtorAmount =
        Number(customerPendingOrders._sum.total || 0) + customerPartialDebt;

      // Fetch customer name
      const customer = await this.prisma.customer.findUnique({
        where: { id: topDebtorId },
        select: { name: true },
      });

      topDebtorName = customer?.name || null;
    }

    return {
      totalDebts: Number(combinedDebts.toFixed(2)),
      unpaidOrdersCount: combinedUnpaidCount,
      topDebtorName,
      topDebtorAmount: Number(topDebtorAmount.toFixed(2)),
      dateRange: { from, to },
      branchId: branchId || null,
    };
  }

  /**
   * Debts Orders List - Paginated list of pending orders (debts)
   */
  async getDebtsOrdersList(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<PaginationResponse<DebtOrderRow>> {
    const {
      from,
      to,
      branchId,
      shiftId,
      search,
      sortBy,
      sortDir = 'desc',
      page = 1,
      pageSize = 10,
    } = query;

    // Validate sortBy
    validateSortBy(sortBy, ALLOWED_SORT_FIELDS.salesOrders, 'debt orders');

    // Build where clause for PENDING orders
    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...FULL_DEBT_WHERE,
      createdAt: {
        gte: from,
        lte: to,
      },
      ...(branchId && { branchId }),
      ...(shiftId && { shiftId }),
      // Search by order number
      ...(search && {
        id: { contains: search, mode: 'insensitive' as const },
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
          type: true,
          createdAt: true,
          subtotal: true,
          discount: true,
          total: true,
          branch: {
            select: { id: true, name: true },
          },
          customer: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true, username: true },
          },
        },
      }),
    ]);

    // Transform to response shape
    const data: DebtOrderRow[] = orders.map((order) => ({
      id: order.id,
      orderNumber: order.id,
      createdAt: order.createdAt,
      branch: order.branch,
      type: order.type,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount) || 0,
      total: Number(order.total),
      customer: order.customer,
      cashier: order.user,
    }));

    return {
      data,
      pagination: buildPagination(totalItems, page, pageSize),
    };
  }

  /**
   * Top Selling Products - Top 10 products by revenue
   */
  async getTopSellingProducts(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId, shiftId } = query;

    // Get order items for completed orders
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          tenantId,
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
        },
      },
      _sum: {
        subtotal: true,
        quantity: true,
      },
      orderBy: {
        _sum: {
          subtotal: 'desc',
        },
      },
      take: 10,
    });

    // Fetch product details
    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        category: {
          select: { name: true },
        },
      },
    });

    // Map to response with product details
    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Unknown',
        categoryName: product?.category?.name || null,
        revenue: Number(item._sum.subtotal) || 0,
        quantitySold: Number(item._sum.quantity) || 0,
      };
    });
  }

  /**
   * Most Ordered Products - Top 5 products by quantity sold
   */
  async getMostOrderedProducts(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId, shiftId } = query;

    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          tenantId,
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    // Fetch product details
    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        category: {
          select: { name: true },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Unknown',
        categoryName: product?.category?.name || null,
        quantitySold: Number(item._sum.quantity) || 0,
      };
    });
  }

  /**
   * Least Sold Products - Bottom 5 products by quantity sold
   */
  async getLeastSoldProducts(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId, shiftId } = query;

    const leastProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          tenantId,
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'asc',
        },
      },
      take: 5,
    });

    // Fetch product details
    const productIds = leastProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        category: {
          select: { name: true },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return leastProducts.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Unknown',
        categoryName: product?.category?.name || null,
        quantitySold: Number(item._sum.quantity) || 0,
      };
    });
  }

  /**
   * Payments Report - Revenue grouped by payment method
   */
  async getPaymentsReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId, shiftId } = query;

    const where: Prisma.PaymentWhereInput = {
      ...(shiftId && { shiftId }),
      order: {
        tenantId,
        // Payments on closed orders (refunded ones stay COMPLETED on the
        // fulfillment axis) plus partially-paid open orders.
        OR: [{ status: OrderStatus.COMPLETED }, PARTIAL_DEBT_WHERE],
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(branchId && { branchId }),
      },
    };

    // Get payment breakdown by method
    const payments = await this.prisma.payment.groupBy({
      by: ['method'],
      where,
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const paymentBreakdown = payments.map((p) => ({
      method: p.method,
      totalAmount: Number(p._sum.amount) || 0,
      transactionCount:
        typeof p._count === 'number'
          ? p._count
          : ((p._count as unknown as { _all: number })._all ?? 0),
    }));

    const grandTotal = paymentBreakdown.reduce(
      (sum, p) => sum + p.totalAmount,
      0,
    );

    // Get total payments count
    const totalPaymentsCount = await this.prisma.payment.count({ where });

    // Determine most used payment method
    let mostUsedMethod: string | null = null;
    if (paymentBreakdown.length > 0) {
      mostUsedMethod = paymentBreakdown.reduce((max, p) =>
        p.transactionCount > max.transactionCount ? p : max,
      ).method;
    }

    return {
      totalAmount: Number(grandTotal.toFixed(2)),
      paymentsCount: totalPaymentsCount,
      mostUsedMethod,
      paymentBreakdown,
      dateRange: { from, to },
      branchId: branchId || null,
    };
  }

  /**
   * Payment Transactions List - Individual payment records with pagination
   */
  async getPaymentTransactionsList(
    tenantId: string,
    query: ReportQueryDto & { page?: number; pageSize?: number },
  ) {
    const { from, to, branchId, shiftId, page = 1, pageSize = 25 } = query;

    const where: Prisma.PaymentWhereInput = {
      ...(shiftId && { shiftId }),
      order: {
        tenantId,
        // Payments on closed orders (refunded ones stay COMPLETED on the
        // fulfillment axis) plus partially-paid open orders.
        OR: [{ status: OrderStatus.COMPLETED }, PARTIAL_DEBT_WHERE],
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(branchId && { branchId }),
      },
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              type: true,
              branch: {
                select: {
                  name: true,
                },
              },
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          paidAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  /**
   * Orders Report - Order counts by status
   */
  async getOrdersReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId, shiftId } = query;

    const orders = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        tenantId,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(branchId && { branchId }),
        ...(shiftId && { shiftId }),
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
      status: OrderStatus.COMPLETED,
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
        status: OrderStatus.COMPLETED,
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
    const { from, to, branchId, shiftId } = query;

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          tenantId,
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
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
        status: OrderStatus.COMPLETED,
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
    const { from, to, branchId, shiftId } = query;

    const products = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          tenantId,
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
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

  // ============================================================
  // CUSTOMER REPORTS
  // ============================================================

  /**
   * Customer Reports Summary - Total customers, active customers, top customer by revenue
   * GET /reports/customers
   */
  async getCustomersReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId, shiftId } = query;

    // Count total customers for the tenant
    const totalCustomers = await this.prisma.customer.count({
      where: { tenantId },
    });

    // Build where clause for orders in date range
    const orderWhere: Prisma.OrderWhereInput = {
      tenantId,
      createdAt: {
        gte: from,
        lte: to,
      },
      ...(branchId && { branchId }),
      ...(shiftId && { shiftId }),
      customerId: { not: null }, // Only orders with customers
    };

    // Get orders grouped by customer for completed orders (for revenue calculation)
    const completedOrdersByCustomer = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: {
        ...orderWhere,
        status: OrderStatus.COMPLETED,
      },
      _sum: {
        total: true,
      },
      _count: true,
    });

    // Count distinct active customers (who placed at least one order in date range)
    const activeCustomers = completedOrdersByCustomer.length;

    // Calculate total revenue and find top customer
    let topCustomerName: string | null = null;
    let topCustomerRevenue = 0;
    let totalRevenue = 0;

    for (const group of completedOrdersByCustomer) {
      const revenue = Number(group._sum.total) || 0;
      totalRevenue += revenue;

      if (revenue > topCustomerRevenue && group.customerId) {
        topCustomerRevenue = revenue;
        // Fetch customer name
        const customer = await this.prisma.customer.findUnique({
          where: { id: group.customerId },
          select: { name: true },
        });
        topCustomerName = customer?.name || null;
      }
    }

    const averageCustomerSpend =
      activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

    return {
      totalCustomers,
      activeCustomers,
      topCustomerName,
      topCustomerRevenue: Number(topCustomerRevenue.toFixed(2)),
      averageCustomerSpend: Number(averageCustomerSpend.toFixed(2)),
      dateRange: { from, to },
      branchId: branchId || null,
    };
  }

  /**
   * Customer Reports List - Paginated customer rows with aggregated order data
   * GET /reports/customers/list
   *
   * For each customer, aggregates:
   * - ordersCount: Total number of orders
   * - totalSpent: Sum of completed orders
   * - outstandingDebt: Sum of pending orders
   * - lastOrderDate: Most recent order date
   */
  async getCustomersReportList(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<PaginationResponse<CustomerReportRow>> {
    const {
      from,
      to,
      branchId,
      shiftId,
      search,
      sortBy,
      sortDir = 'desc',
      page = 1,
      pageSize = 25,
    } = query;

    // Build base where clause for customers
    const customerWhere: Prisma.CustomerWhereInput = {
      tenantId,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    // Get total count of customers
    const totalItems = await this.prisma.customer.count({
      where: customerWhere,
    });

    // Fetch paginated customers
    const customers = await this.prisma.customer.findMany({
      where: customerWhere,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    // For each customer, aggregate their order data
    const data: CustomerReportRow[] = await Promise.all(
      customers.map(async (customer) => {
        // Build order where clause
        const orderWhere: Prisma.OrderWhereInput = {
          tenantId,
          customerId: customer.id,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
        };

        // Aggregate all orders
        const [allOrders, completedOrders, pendingOrders, lastOrder] =
          await Promise.all([
            // Total order count
            this.prisma.order.count({ where: orderWhere }),

            // Completed orders total
            this.prisma.order.aggregate({
              where: { ...orderWhere, status: OrderStatus.COMPLETED },
              _sum: { total: true },
            }),

            // Pending orders total (debt)
            this.prisma.order.aggregate({
              where: { ...orderWhere, ...FULL_DEBT_WHERE },
              _sum: { total: true },
            }),

            // Last order date
            this.prisma.order.findFirst({
              where: orderWhere,
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true },
            }),
          ]);

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          ordersCount: allOrders,
          totalSpent: Number(completedOrders._sum.total) || 0,
          outstandingDebt: Number(pendingOrders._sum.total) || 0,
          lastOrderDate: lastOrder?.createdAt || null,
        };
      }),
    );

    // Sort results if needed (since we aggregate in-memory, we sort here)
    if (sortBy) {
      const sortMultiplier = sortDir === 'asc' ? 1 : -1;
      data.sort((a, b) => {
        const aVal = a[sortBy as keyof CustomerReportRow];
        const bVal = b[sortBy as keyof CustomerReportRow];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * sortMultiplier;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * sortMultiplier;
        }
        if (aVal instanceof Date && bVal instanceof Date) {
          return (aVal.getTime() - bVal.getTime()) * sortMultiplier;
        }
        return 0;
      });
    }

    return {
      data,
      pagination: buildPagination(totalItems, page, pageSize),
    };
  }

  // ============================================================
  // FINANCIALS REPORTS
  // ============================================================

  /**
   * Financials Report Summary - Revenue, profits, debts, top profit product
   * GET /reports/financials
   */
  async getFinancialsReport(tenantId: string, query: ReportQueryDto) {
    const { from, to, branchId, shiftId } = query;

    // Build where clause for completed orders
    const orderWhere: Prisma.OrderWhereInput = {
      tenantId,
      status: OrderStatus.COMPLETED,
      createdAt: {
        gte: from,
        lte: to,
      },
      ...(branchId && { branchId }),
      ...(shiftId && { shiftId }),
    };

    // 1. Get total revenue (COMPLETED orders only)
    const revenueAgg = await this.prisma.order.aggregate({
      where: orderWhere,
      _sum: {
        total: true,
      },
    });

    const completedRevenue = Number(revenueAgg._sum.total) || 0;

    // Get PARTIALLY_PAID revenue (only the paid portion)
    const partiallyPaidOrders = await this.prisma.order.findMany({
      where: {
        tenantId,
        ...PARTIAL_DEBT_WHERE,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(branchId && { branchId }),
        ...(shiftId && { shiftId }),
      },
      include: {
        payments: true,
      },
    });

    const partiallyPaidRevenue = partiallyPaidOrders.reduce((sum, order) => {
      const totalPaid = order.payments.reduce(
        (pSum, payment) => pSum + Number(payment.amount),
        0,
      );
      return sum + totalPaid;
    }, 0);

    const totalRevenue = completedRevenue + partiallyPaidRevenue;

    // 2. Get total debts (PENDING orders full amount)
    const debtsAgg = await this.prisma.order.aggregate({
      where: {
        tenantId,
        ...FULL_DEBT_WHERE,
        createdAt: {
          gte: from,
          lte: to,
        },
        ...(branchId && { branchId }),
        ...(shiftId && { shiftId }),
      },
      _sum: {
        total: true,
      },
    });

    const pendingDebts = Number(debtsAgg._sum.total) || 0;

    // Get PARTIALLY_PAID debts (only the unpaid portion)
    const partiallyPaidDebts = partiallyPaidOrders.reduce((sum, order) => {
      const totalPaid = order.payments.reduce(
        (pSum, payment) => pSum + Number(payment.amount),
        0,
      );
      const unpaid = Number(order.total) - totalPaid;
      return sum + unpaid;
    }, 0);

    const totalDebts = pendingDebts + partiallyPaidDebts;

    // 3. Calculate total COGS and find top profit product
    // Get all order items with product cost
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: orderWhere,
      },
      select: {
        quantity: true,
        total: true,
        productId: true,
        product: {
          select: {
            cost: true,
            name: true,
          },
        },
      },
    });

    let totalCOGS = 0;
    const productProfits = new Map<
      string,
      { name: string; revenue: number; cost: number; profit: number }
    >();

    for (const item of orderItems) {
      const cost = Number(item.product.cost) || 0;
      const quantity = Number(item.quantity);
      const revenue = Number(item.total);
      const itemCOGS = cost * quantity;

      totalCOGS += itemCOGS;

      // Aggregate per product
      const existing = productProfits.get(item.productId);
      if (existing) {
        existing.revenue += revenue;
        existing.cost += itemCOGS;
        existing.profit = existing.revenue - existing.cost;
      } else {
        productProfits.set(item.productId, {
          name: item.product.name,
          revenue,
          cost: itemCOGS,
          profit: revenue - itemCOGS,
        });
      }
    }

    const totalProfits = totalRevenue - totalCOGS;

    // Find top profit product
    let topProfitProductName: string | null = null;
    let topProfitProductProfit = 0;

    for (const product of productProfits.values()) {
      if (product.profit > topProfitProductProfit) {
        topProfitProductProfit = product.profit;
        topProfitProductName = product.name;
      }
    }

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalProfits: Number(totalProfits.toFixed(2)),
      totalDebts: Number(totalDebts.toFixed(2)),
      topProfitProductName,
      topProfitProductProfit: Number(topProfitProductProfit.toFixed(2)),
      dateRange: { from, to },
      branchId: branchId || null,
    };
  }

  /**
   * Products with Profit - Returns products with revenue, cost, profit, margin
   * GET /reports/financials/products
   *
   * Follows same pattern as getTopProductsReportList but includes cost/profit
   */
  async getProductsWithProfit(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<ProductProfitRow[]> {
    const { from, to, branchId, shiftId, limit = 5 } = query;

    // Group order items by product (same pattern as top products)
    const groupedProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          tenantId,
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
        },
      },
      _sum: {
        total: true,
        quantity: true,
      },
    });

    // Fetch product details with cost and category
    const productIds = groupedProducts.map((p) => p.productId);
    const productDetails = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        cost: true,
        category: {
          select: { name: true },
        },
      },
    });

    const productMap = new Map(
      productDetails.map((p) => [
        p.id,
        {
          name: p.name,
          cost: Number(p.cost) || 0,
          categoryName: p.category?.name ?? null,
        },
      ]),
    );

    // Calculate profit for each product
    const results: ProductProfitRow[] = groupedProducts.map((p) => {
      const details = productMap.get(p.productId);
      const revenue = Number(p._sum.total) || 0;
      const qtySold = Number(p._sum.quantity) || 0;
      const costPerUnit = details?.cost || 0;
      const totalCost = costPerUnit * qtySold;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        productId: p.productId,
        productName: details?.name || 'Unknown Product',
        categoryName: details?.categoryName ?? null,
        revenue,
        profit,
        margin: Number(margin.toFixed(2)),
        qtySold,
      };
    });

    // Sort by profit DESC (following existing sort pattern)
    results.sort((a, b) => b.profit - a.profit);

    // Return top N (following existing limit pattern)
    return results.slice(0, limit);
  }

  /**
   * Category Revenue - Returns revenue and profit grouped by category
   * GET /reports/financials/categories
   */
  async getCategoryRevenue(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<CategoryRevenueRow[]> {
    const { from, to, branchId, shiftId } = query;

    // Get all order items with product category and cost
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          tenantId,
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: from,
            lte: to,
          },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
        },
      },
      select: {
        total: true,
        quantity: true,
        product: {
          select: {
            cost: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Aggregate by category
    const categoryMap = new Map<
      string,
      { name: string; revenue: number; cost: number }
    >();

    for (const item of orderItems) {
      const categoryId = item.product.category?.id;
      const categoryName = item.product.category?.name;

      if (!categoryId || !categoryName) continue;

      const revenue = Number(item.total);
      const cost = Number(item.product.cost) || 0;
      const quantity = Number(item.quantity);
      const totalCost = cost * quantity;

      const existing = categoryMap.get(categoryId);
      if (existing) {
        existing.revenue += revenue;
        existing.cost += totalCost;
      } else {
        categoryMap.set(categoryId, {
          name: categoryName,
          revenue,
          cost: totalCost,
        });
      }
    }

    // Transform to array with profit
    const results: CategoryRevenueRow[] = Array.from(categoryMap.entries()).map(
      ([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        revenue: Number(data.revenue.toFixed(2)),
        profit: Number((data.revenue - data.cost).toFixed(2)),
      }),
    );

    // Sort by revenue DESC (following existing pattern)
    results.sort((a, b) => b.revenue - a.revenue);

    return results;
  }

  // ============================================================
  // LOYALTY REPORT ENDPOINTS
  // ============================================================

  /**
   * Loyalty Summary - Aggregate loyalty metrics
   * GET /reports/loyalty
   */
  async getLoyaltySummary(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<LoyaltySummaryRow> {
    const { from, to } = query;

    // Aggregate across all loyalty accounts for this tenant
    const accountAgg = await this.prisma.loyaltyAccount.aggregate({
      where: { tenantId },
      _sum: {
        pointsBalance: true,
        lifetimeEarned: true,
        lifetimeRedeemed: true,
        lifetimeRestored: true,
        lifetimeReversed: true,
        lifetimeAdjusted: true,
      },
      _count: { id: true },
    });

    // Count transactions in period
    const txCount = await this.prisma.loyaltyTransaction.count({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
      },
    });

    return {
      totalAccounts: accountAgg._count.id,
      totalPointsInCirculation: accountAgg._sum.pointsBalance ?? 0,
      totalLifetimeEarned: accountAgg._sum.lifetimeEarned ?? 0,
      totalLifetimeRedeemed: accountAgg._sum.lifetimeRedeemed ?? 0,
      totalLifetimeRestored: accountAgg._sum.lifetimeRestored ?? 0,
      totalLifetimeReversed: accountAgg._sum.lifetimeReversed ?? 0,
      totalLifetimeAdjusted: accountAgg._sum.lifetimeAdjusted ?? 0,
      transactionsInPeriod: txCount,
    };
  }

  /**
   * Loyalty Transactions List - Paginated ledger entries
   * GET /reports/loyalty/transactions
   */
  async getLoyaltyTransactionsList(
    tenantId: string,
    query: ReportQueryDto,
  ): Promise<PaginationResponse<LoyaltyTransactionRow>> {
    const {
      from,
      to,
      sortBy,
      sortDir = 'desc',
      page = 1,
      pageSize = 25,
    } = query;

    validateSortBy(
      sortBy,
      ALLOWED_SORT_FIELDS.loyaltyTransactions,
      'loyalty transactions',
    );

    const where: Prisma.LoyaltyTransactionWhereInput = {
      tenantId,
      createdAt: { gte: from, lte: to },
    };

    const [totalItems, rows] = await Promise.all([
      this.prisma.loyaltyTransaction.count({ where }),
      this.prisma.loyaltyTransaction.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          type: true,
          direction: true,
          points: true,
          moneyAmount: true,
          balanceAfter: true,
          reason: true,
          customer: { select: { id: true, name: true } },
          order: { select: { id: true } },
          refund: { select: { id: true } },
          actorUser: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy || 'createdAt']: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data: LoyaltyTransactionRow[] = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      type: r.type,
      direction: r.direction,
      points: r.points,
      moneyAmount: r.moneyAmount ? Number(r.moneyAmount) : null,
      balanceAfter: r.balanceAfter,
      reason: r.reason,
      customer: r.customer,
      order: r.order,
      refund: r.refund,
      actorUser: r.actorUser,
    }));

    return {
      data,
      pagination: buildPagination(totalItems, page, pageSize),
    };
  }
}
