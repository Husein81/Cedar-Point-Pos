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
import { PaginationResponse, REPORTING_CURRENCY_CODE } from '@repo/types';

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

  /**
   * The tenant's current base → reporting currency rate, used only for orders
   * created before rates were snapshotted (`exchangeRate` null). Newer orders
   * carry their own frozen rate so their reported revenue never moves.
   *
   * Falls back to 1 when the tenant has no reporting currency configured — the
   * figures then read as base currency rather than silently becoming zero.
   */
  private async resolveFallbackReportingRate(
    tenantId: string,
  ): Promise<number> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { baseCurrencyCode: true },
    });

    if (!tenant || tenant.baseCurrencyCode === REPORTING_CURRENCY_CODE) {
      return 1;
    }

    const reportingCurrency = await this.prisma.tenantCurrency.findUnique({
      where: {
        tenantId_currencyCode: {
          tenantId,
          currencyCode: REPORTING_CURRENCY_CODE,
        },
      },
      select: { exchangeRate: true },
    });

    const rate = Number(reportingCurrency?.exchangeRate ?? 0);
    return rate > 0 ? rate : 1;
  }

  /**
   * Convert a base-currency amount to the reporting currency. Aggregates must
   * convert per order *before* summing — each order can carry a different
   * frozen rate, so converting an already-summed total would apply one rate to
   * everything and misstate history.
   */
  private toReporting(
    amount: Prisma.Decimal | number | null | undefined,
    orderRate: Prisma.Decimal | null | undefined,
    fallbackRate: number,
  ): number {
    const rate = orderRate === null || orderRate === undefined
      ? fallbackRate
      : Number(orderRate);
    return Number(amount ?? 0) * rate;
  }

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
    const [fallbackRate, totalItems, orders] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
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
          exchangeRate: true,
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

      // Reporting is expressed in REPORTING_CURRENCY_CODE, converted at the
      // rate this order froze at creation.
      const convert = (value: Prisma.Decimal | number | null | undefined) =>
        this.toReporting(value, order.exchangeRate, fallbackRate);

      order.payments.forEach((p) => {
        const amount = convert(p.amount);
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
        subtotal: convert(order.subtotal),
        discount: convert(order.discount),
        total: convert(order.total),
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

    // Folded in memory so each line converts at its own order's frozen rate.
    const [fallbackRate, items] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.orderItem.findMany({
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
        select: {
          productId: true,
          total: true,
          quantity: true,
          order: { select: { exchangeRate: true } },
        },
      }),
    ]);

    const groupedMap = new Map<
      string,
      { productId: string; revenue: number; quantity: number }
    >();

    for (const item of items) {
      const revenue = this.toReporting(
        item.total,
        item.order.exchangeRate,
        fallbackRate,
      );
      const existing = groupedMap.get(item.productId);
      if (existing) {
        existing.revenue += revenue;
        existing.quantity += Number(item.quantity);
      } else {
        groupedMap.set(item.productId, {
          productId: item.productId,
          revenue,
          quantity: Number(item.quantity),
        });
      }
    }

    const groupedProducts = Array.from(groupedMap.values());

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
      const revenue = p.revenue;
      const qtySold = p.quantity;
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

    // Revenue must be converted per order *before* summing — each order can
    // carry a different frozen rate, so a SQL-level SUM of base amounts cannot
    // express this. Fetch the narrow columns and fold them in memory instead.
    const [fallbackRate, revenueRows, ordersByType] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.order.findMany({
        where,
        select: {
          total: true,
          subtotal: true,
          discount: true,
          exchangeRate: true,
        },
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

    const totals = revenueRows.reduce(
      (acc, row) => {
        acc.total += this.toReporting(row.total, row.exchangeRate, fallbackRate);
        acc.subtotal += this.toReporting(
          row.subtotal,
          row.exchangeRate,
          fallbackRate,
        );
        acc.discount += this.toReporting(
          row.discount,
          row.exchangeRate,
          fallbackRate,
        );
        return acc;
      },
      { total: 0, subtotal: 0, discount: 0 },
    );

    const totalRevenue = totals.total;
    const orderCount = revenueRows.length;

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
        (pSum, payment) =>
          pSum +
          this.toReporting(payment.amount, order.exchangeRate, fallbackRate),
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
      totalSubtotal: Number(totals.subtotal.toFixed(2)),
      totalDiscount: Number(totals.discount.toFixed(2)),
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

    // Get aggregated totals — converted per order before summing.
    const [fallbackRate, debtRows] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.order.findMany({
        where,
        select: { total: true, exchangeRate: true },
      }),
    ]);

    const totalDebts = debtRows.reduce(
      (sum, row) =>
        sum + this.toReporting(row.total, row.exchangeRate, fallbackRate),
      0,
    );
    const unpaidOrdersCount = debtRows.length;

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
        (pSum, payment) =>
          pSum +
          this.toReporting(payment.amount, order.exchangeRate, fallbackRate),
        0,
      );
      const unpaid =
        this.toReporting(order.total, order.exchangeRate, fallbackRate) -
        totalPaid;
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
          (pSum, payment) =>
            pSum +
            this.toReporting(payment.amount, order.exchangeRate, fallbackRate),
          0,
        );
        return (
          sum +
          (this.toReporting(order.total, order.exchangeRate, fallbackRate) -
            totalPaid)
        );
      }, 0);

      // Get PENDING orders total for this customer
      const customerPendingOrders = await this.prisma.order.findMany({
        where: {
          customerId: topDebtorId,
          ...FULL_DEBT_WHERE,
          createdAt: { gte: from, lte: to },
          ...(branchId && { branchId }),
          ...(shiftId && { shiftId }),
        },
        select: { total: true, exchangeRate: true },
      });

      topDebtorAmount =
        customerPendingOrders.reduce(
          (sum, order) =>
            sum +
            this.toReporting(order.total, order.exchangeRate, fallbackRate),
          0,
        ) + customerPartialDebt;

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
    const [fallbackRate, totalItems, orders] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
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
          exchangeRate: true,
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
      subtotal: this.toReporting(
        order.subtotal,
        order.exchangeRate,
        fallbackRate,
      ),
      discount: this.toReporting(
        order.discount,
        order.exchangeRate,
        fallbackRate,
      ),
      total: this.toReporting(order.total, order.exchangeRate, fallbackRate),
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

    // Grouped and ranked in memory: revenue converts at each order's own frozen
    // rate, so a SQL _sum (and its orderBy) can't produce the right ranking.
    const [fallbackRate, items] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.orderItem.findMany({
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
          productId: true,
          subtotal: true,
          quantity: true,
          order: { select: { exchangeRate: true } },
        },
      }),
    ]);

    const byProduct = new Map<
      string,
      { productId: string; revenue: number; quantity: number }
    >();

    for (const item of items) {
      const revenue = this.toReporting(
        item.subtotal,
        item.order.exchangeRate,
        fallbackRate,
      );
      const existing = byProduct.get(item.productId);
      if (existing) {
        existing.revenue += revenue;
        existing.quantity += Number(item.quantity);
      } else {
        byProduct.set(item.productId, {
          productId: item.productId,
          revenue,
          quantity: Number(item.quantity),
        });
      }
    }

    const topProducts = Array.from(byProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

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
        revenue: Number(item.revenue.toFixed(2)),
        quantitySold: item.quantity,
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

    // Grouped in memory rather than via groupBy: each payment converts at its
    // own order's frozen rate, which a SQL-level SUM cannot express.
    const [fallbackRate, payments] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.payment.findMany({
        where,
        select: {
          method: true,
          amount: true,
          order: { select: { exchangeRate: true } },
        },
      }),
    ]);

    const breakdownByMethod = new Map<
      string,
      { method: string; totalAmount: number; transactionCount: number }
    >();

    for (const payment of payments) {
      const amount = this.toReporting(
        payment.amount,
        payment.order?.exchangeRate,
        fallbackRate,
      );
      const existing = breakdownByMethod.get(payment.method);
      if (existing) {
        existing.totalAmount += amount;
        existing.transactionCount += 1;
      } else {
        breakdownByMethod.set(payment.method, {
          method: payment.method,
          totalAmount: amount,
          transactionCount: 1,
        });
      }
    }

    const paymentBreakdown = Array.from(breakdownByMethod.values());

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

    const [fallbackRate, rows, totalItems] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              type: true,
              exchangeRate: true,
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

    // Amounts are stored in the order's currency; report them converted.
    const data = rows.map((payment) => ({
      ...payment,
      amount: this.toReporting(
        payment.amount,
        payment.order?.exchangeRate,
        fallbackRate,
      ),
    }));

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

    const [fallbackRate, revenueRows, orderCount] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.order.findMany({
        where,
        select: { total: true, exchangeRate: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalRevenue = revenueRows.reduce(
      (sum, row) =>
        sum + this.toReporting(row.total, row.exchangeRate, fallbackRate),
      0,
    );

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

    const [fallbackRate, orders] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.order.findMany({
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
          exchangeRate: true,
        },
      }),
    ]);

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
      salesByDay.set(
        dateStr,
        currentTotal +
          this.toReporting(order.total, order.exchangeRate, fallbackRate),
      );
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

    const [fallbackRate, orderItems] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.orderItem.findMany({
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
          // Item amounts are in the parent order's currency, so the rate to
          // convert them by lives on the order.
          order: { select: { exchangeRate: true } },
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
      }),
    ]);

    // Group by category
    const categoryMap = new Map<
      string,
      { name: string; sales: number; value: number }
    >();

    orderItems.forEach((item) => {
      const categoryId = item.product.categoryId || 'uncategorized';
      const categoryName = item.product.category?.name || 'Uncategorized';
      const itemTotal = this.toReporting(
        item.total,
        item.order.exchangeRate,
        fallbackRate,
      );

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

    const [fallbackRate, orders] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.order.findMany({
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
          exchangeRate: true,
        },
      }),
    ]);

    // Initialize all hours with 0
    const revenueByHour = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      revenueByHour.set(i, 0);
    }

    // Group by hour
    orders.forEach((order) => {
      const hour = order.createdAt.getHours();
      const currentRevenue = revenueByHour.get(hour) || 0;
      revenueByHour.set(
        hour,
        currentRevenue +
          this.toReporting(order.total, order.exchangeRate, fallbackRate),
      );
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

    // Ranked in memory: revenue converts per order, so the DB cannot rank it.
    const [fallbackRate, items] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.orderItem.findMany({
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
          productId: true,
          total: true,
          quantity: true,
          order: { select: { exchangeRate: true } },
        },
      }),
    ]);

    const byProduct = new Map<string, { revenue: number; sold: number }>();
    for (const item of items) {
      const revenue = this.toReporting(
        item.total,
        item.order.exchangeRate,
        fallbackRate,
      );
      const existing = byProduct.get(item.productId);
      if (existing) {
        existing.revenue += revenue;
        existing.sold += Number(item.quantity);
      } else {
        byProduct.set(item.productId, {
          revenue,
          sold: Number(item.quantity),
        });
      }
    }

    const products = Array.from(byProduct.entries())
      .map(([productId, totals]) => ({ productId, ...totals }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

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
      revenue: Number(p.revenue.toFixed(2)),
      sold: p.sold,
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
    // Grouped in memory so each order converts at its own frozen rate.
    const [fallbackRate, customerOrders] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.order.findMany({
        where: {
          ...orderWhere,
          status: OrderStatus.COMPLETED,
        },
        select: { customerId: true, total: true, exchangeRate: true },
      }),
    ]);

    const revenueByCustomer = new Map<string | null, number>();
    for (const order of customerOrders) {
      const revenue = this.toReporting(
        order.total,
        order.exchangeRate,
        fallbackRate,
      );
      revenueByCustomer.set(
        order.customerId,
        (revenueByCustomer.get(order.customerId) ?? 0) + revenue,
      );
    }

    // Count distinct active customers (who placed at least one order in date range)
    const activeCustomers = revenueByCustomer.size;

    // Calculate total revenue and find top customer
    let topCustomerName: string | null = null;
    let topCustomerRevenue = 0;
    let totalRevenue = 0;
    let topCustomerId: string | null = null;

    for (const [customerId, revenue] of revenueByCustomer) {
      totalRevenue += revenue;

      if (revenue > topCustomerRevenue && customerId) {
        topCustomerRevenue = revenue;
        topCustomerId = customerId;
      }
    }

    if (topCustomerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: topCustomerId },
        select: { name: true },
      });
      topCustomerName = customer?.name || null;
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

    const fallbackRate = await this.resolveFallbackReportingRate(tenantId);

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

        // Aggregate all orders — money folds in memory so each order converts
        // at its own frozen rate.
        const [allOrders, completedOrders, pendingOrders, lastOrder] =
          await Promise.all([
            // Total order count
            this.prisma.order.count({ where: orderWhere }),

            // Completed orders total
            this.prisma.order.findMany({
              where: { ...orderWhere, status: OrderStatus.COMPLETED },
              select: { total: true, exchangeRate: true },
            }),

            // Pending orders total (debt)
            this.prisma.order.findMany({
              where: { ...orderWhere, ...FULL_DEBT_WHERE },
              select: { total: true, exchangeRate: true },
            }),

            // Last order date
            this.prisma.order.findFirst({
              where: orderWhere,
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true },
            }),
          ]);

        const sumConverted = (
          rows: Array<{
            total: Prisma.Decimal;
            exchangeRate: Prisma.Decimal | null;
          }>,
        ) =>
          rows.reduce(
            (sum, row) =>
              sum + this.toReporting(row.total, row.exchangeRate, fallbackRate),
            0,
          );

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          ordersCount: allOrders,
          totalSpent: sumConverted(completedOrders),
          outstandingDebt: sumConverted(pendingOrders),
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

    // 1. Get total revenue (COMPLETED orders only), converted per order.
    const [fallbackRate, revenueRows] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.order.findMany({
        where: orderWhere,
        select: { total: true, exchangeRate: true },
      }),
    ]);

    const completedRevenue = revenueRows.reduce(
      (sum, row) =>
        sum + this.toReporting(row.total, row.exchangeRate, fallbackRate),
      0,
    );

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
        (pSum, payment) =>
          pSum +
          this.toReporting(payment.amount, order.exchangeRate, fallbackRate),
        0,
      );
      return sum + totalPaid;
    }, 0);

    const totalRevenue = completedRevenue + partiallyPaidRevenue;

    // 2. Get total debts (PENDING orders full amount)
    const debtRows = await this.prisma.order.findMany({
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
      select: { total: true, exchangeRate: true },
    });

    const pendingDebts = debtRows.reduce(
      (sum, row) =>
        sum + this.toReporting(row.total, row.exchangeRate, fallbackRate),
      0,
    );

    // Get PARTIALLY_PAID debts (only the unpaid portion)
    const partiallyPaidDebts = partiallyPaidOrders.reduce((sum, order) => {
      const totalPaid = order.payments.reduce(
        (pSum, payment) =>
          pSum +
          this.toReporting(payment.amount, order.exchangeRate, fallbackRate),
        0,
      );
      const unpaid =
        this.toReporting(order.total, order.exchangeRate, fallbackRate) -
        totalPaid;
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
        order: { select: { exchangeRate: true } },
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
      // Revenue and COGS must convert at the SAME rate or the profit figure is
      // meaningless. Product cost isn't order-linked, so the sale's own rate is
      // the one that applies to both sides.
      const revenue = this.toReporting(
        item.total,
        item.order.exchangeRate,
        fallbackRate,
      );
      const itemCOGS = this.toReporting(
        cost * quantity,
        item.order.exchangeRate,
        fallbackRate,
      );

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

    // Group order items by product, folding in memory so revenue converts at
    // each order's own frozen rate.
    const [fallbackRate, items] = await Promise.all([
      this.resolveFallbackReportingRate(tenantId),
      this.prisma.orderItem.findMany({
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
          productId: true,
          total: true,
          quantity: true,
          order: { select: { exchangeRate: true } },
        },
      }),
    ]);

    const groupedMap = new Map<
      string,
      { productId: string; revenue: number; quantity: number; rate: number }
    >();

    for (const item of items) {
      const rate = Number(item.order.exchangeRate ?? fallbackRate);
      const revenue = this.toReporting(
        item.total,
        item.order.exchangeRate,
        fallbackRate,
      );
      const existing = groupedMap.get(item.productId);
      if (existing) {
        existing.revenue += revenue;
        existing.quantity += Number(item.quantity);
      } else {
        groupedMap.set(item.productId, {
          productId: item.productId,
          revenue,
          quantity: Number(item.quantity),
          // Cost is a product-level base amount with no order of its own, so
          // it converts at the rate of the sales it is being compared against.
          rate,
        });
      }
    }

    const groupedProducts = Array.from(groupedMap.values());

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
      const revenue = p.revenue;
      const qtySold = p.quantity;
      // Convert cost at the same rate as the revenue it's compared against,
      // otherwise the margin mixes two currencies.
      const costPerUnit = (details?.cost || 0) * p.rate;
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
        order: { select: { exchangeRate: true } },
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

    const fallbackRate = await this.resolveFallbackReportingRate(tenantId);

    // Aggregate by category
    const categoryMap = new Map<
      string,
      { name: string; revenue: number; cost: number }
    >();

    for (const item of orderItems) {
      const categoryId = item.product.category?.id;
      const categoryName = item.product.category?.name;

      if (!categoryId || !categoryName) continue;

      // Revenue and cost convert at the same rate so the margin stays coherent.
      const revenue = this.toReporting(
        item.total,
        item.order.exchangeRate,
        fallbackRate,
      );
      const cost = Number(item.product.cost) || 0;
      const quantity = Number(item.quantity);
      const totalCost = this.toReporting(
        cost * quantity,
        item.order.exchangeRate,
        fallbackRate,
      );

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
