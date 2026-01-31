import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '../../generated/prisma/client.js';
import { InventoryTransactionService } from '../inventory/inventory-transaction.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRefundDto, ValidateRefundDto } from './dto/create-refund.dto.js';

/**
 * Warning codes for refund validation
 * These are returned to frontend for user acknowledgment
 */
export enum RefundWarningCode {
  ORDER_OLD = 'ORDER_OLD', // Order is older than 30 days
  HIGH_VALUE = 'HIGH_VALUE', // Refund amount exceeds threshold
  MULTIPLE_REFUNDS = 'MULTIPLE_REFUNDS', // Order already has refunds
  MANUAL_REFUND = 'MANUAL_REFUND', // No order reference
  OVER_REFUND = 'OVER_REFUND', // Refund exceeds order total
  DIFFERENT_BRANCH = 'DIFFERENT_BRANCH', // Refund at different branch
}

/**
 * Warning severity levels
 */
export enum WarningSeverity {
  INFO = 'INFO', // Just informational
  WARNING = 'WARNING', // Requires acknowledgment
  MANAGER_REQUIRED = 'MANAGER_REQUIRED', // Requires manager override
}

export interface RefundWarning {
  code: RefundWarningCode;
  severity: WarningSeverity;
  message: string;
  details?: Record<string, unknown>;
}

interface RefundableOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
}

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryTransactionService: InventoryTransactionService,
  ) {}

  /**
   * Lookup refundable items by barcode/SKU (Scanner-first flow)
   * Returns product info + recent order items containing this product
   */
  async lookupRefundableByBarcode(
    tenantId: string,
    barcode: string,
    branchId?: string,
    limit: number = 10,
  ) {
    if (!barcode || barcode.trim().length === 0) {
      throw new BadRequestException('Barcode is required');
    }

    const searchTerm = barcode.trim();

    // 1. Find product by barcode or SKU
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        OR: [
          { barcode: { equals: searchTerm, mode: 'insensitive' } },
          { sku: { equals: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        price: true,
        imageUrl: true,
      },
    });

    if (!product) {
      return {
        found: false,
        product: null,
        refundableItems: [],
        canManualRefund: true,
        message: 'Product not found. Manual refund available.',
      };
    }

    // 2. Find recent order items containing this product (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        productId: product.id,
        order: {
          tenantId,
          status: OrderStatus.COMPLETED,
          completedAt: { gte: ninetyDaysAgo },
          ...(branchId && { branchId }),
        },
      },
      take: limit,
      orderBy: { order: { completedAt: 'desc' } },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            completedAt: true,
            branchId: true,
            customer: { select: { name: true } },
          },
        },
      },
    });

    // 3. Get refunded quantities for these order items
    const orderItemIds = orderItems.map((oi) => oi.id);
    const refundedMap = await this.getRefundedQuantitiesMap(
      undefined,
      orderItemIds,
    );

    // 4. Build refundable items list
    const refundableItems = orderItems
      .map((oi) => {
        const refundedQty = refundedMap.get(oi.id) ?? new Prisma.Decimal(0);
        const originalQty = new Prisma.Decimal(oi.quantity);
        const refundableQty = originalQty.minus(refundedQty);

        return {
          orderItemId: oi.id,
          orderId: oi.order.id,
          orderNumber: oi.order.orderNumber,
          orderDate: oi.order.completedAt?.toISOString() ?? null,
          branchId: oi.order.branchId,
          customerName: oi.order.customer?.name ?? null,
          quantity: originalQty.toNumber(),
          unitPrice: Number(oi.unitPrice),
          refundedQuantity: refundedQty.toNumber(),
          refundableQuantity: refundableQty.toNumber(),
        };
      })
      .filter((item) => item.refundableQuantity > 0); // Only show items with available quantity

    return {
      found: true,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: Number(product.price),
        imageUrl: product.imageUrl,
      },
      refundableItems,
      canManualRefund: true,
      message:
        refundableItems.length > 0
          ? `Found ${refundableItems.length} refundable purchase(s)`
          : 'No recent purchases found. Manual refund available.',
    };
  }

  /**
   * Validate a refund request and return warnings
   * This allows frontend to show warnings before submitting
   */
  async validateRefund(
    tenantId: string,
    userRole: string,
    dto: ValidateRefundDto,
  ): Promise<{
    valid: boolean;
    warnings: RefundWarning[];
    requiresManagerOverride: boolean;
    estimatedTotal: number;
  }> {
    const warnings: RefundWarning[] = [];
    let estimatedTotal = 0;

    const isManager = ['ADMIN', 'MANAGER', 'SYSTEM_ADMIN'].includes(userRole);
    const isManualRefund =
      dto.manualRefund === true &&
      Array.isArray(dto.manualItems) &&
      dto.manualItems.length > 0;

    if (isManualRefund) {
      // Manual refund warnings
      warnings.push({
        code: RefundWarningCode.MANUAL_REFUND,
        severity: WarningSeverity.WARNING,
        message: 'This is a manual refund without order reference.',
      });

      // Calculate estimated total
      for (const item of dto.manualItems ?? []) {
        estimatedTotal += item.quantity * item.unitPrice;
      }

      // High value warning for manual refunds
      if (estimatedTotal > 500) {
        warnings.push({
          code: RefundWarningCode.HIGH_VALUE,
          severity: WarningSeverity.MANAGER_REQUIRED,
          message: `High value refund: $${estimatedTotal.toFixed(2)}`,
          details: { amount: estimatedTotal, threshold: 500 },
        });
      }
    } else if (dto.orderId) {
      // Order-linked refund validation
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, tenantId },
        include: {
          items: true,
          refunds: { select: { id: true, totalAmount: true } },
        },
      });

      if (!order) {
        return {
          valid: false,
          warnings: [
            {
              code: RefundWarningCode.ORDER_OLD,
              severity: WarningSeverity.MANAGER_REQUIRED,
              message: 'Order not found',
            },
          ],
          requiresManagerOverride: true,
          estimatedTotal: 0,
        };
      }

      // Calculate estimated refund total
      const orderItemMap = new Map(order.items.map((i) => [i.id, i]));
      for (const item of dto.items ?? []) {
        const orderItem = orderItemMap.get(item.orderItemId);
        if (orderItem) {
          estimatedTotal += item.quantity * Number(orderItem.unitPrice);
        }
      }

      // Check order age (30+ days)
      const orderAge = Math.floor(
        (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (orderAge > 30) {
        warnings.push({
          code: RefundWarningCode.ORDER_OLD,
          severity: WarningSeverity.WARNING,
          message: `Order is ${orderAge} days old`,
          details: { orderAge, threshold: 30 },
        });
      }

      // Check for existing refunds
      if (order.refunds.length > 0) {
        const previousRefundTotal = order.refunds.reduce(
          (sum, r) => sum + Number(r.totalAmount),
          0,
        );
        warnings.push({
          code: RefundWarningCode.MULTIPLE_REFUNDS,
          severity: WarningSeverity.INFO,
          message: `Order has ${order.refunds.length} previous refund(s) totaling $${previousRefundTotal.toFixed(2)}`,
          details: {
            refundCount: order.refunds.length,
            previousTotal: previousRefundTotal,
          },
        });
      }

      // Check for over-refund
      const orderTotal = Number(order.total);
      const previousRefundTotal = order.refunds.reduce(
        (sum, r) => sum + Number(r.totalAmount),
        0,
      );
      if (estimatedTotal + previousRefundTotal > orderTotal) {
        warnings.push({
          code: RefundWarningCode.OVER_REFUND,
          severity: WarningSeverity.MANAGER_REQUIRED,
          message: `Refund would exceed order total ($${orderTotal.toFixed(2)})`,
          details: {
            orderTotal,
            previousRefunds: previousRefundTotal,
            thisRefund: estimatedTotal,
            totalAfterRefund: previousRefundTotal + estimatedTotal,
          },
        });
      }

      // High value warning
      if (estimatedTotal > 500) {
        warnings.push({
          code: RefundWarningCode.HIGH_VALUE,
          severity: WarningSeverity.WARNING,
          message: `High value refund: $${estimatedTotal.toFixed(2)}`,
          details: { amount: estimatedTotal, threshold: 500 },
        });
      }
    }

    // Determine if manager override is required
    const requiresManagerOverride =
      !isManager &&
      warnings.some((w) => w.severity === WarningSeverity.MANAGER_REQUIRED);

    return {
      valid: true,
      warnings,
      requiresManagerOverride,
      estimatedTotal,
    };
  }

  /**
   * Get orders eligible for refund
   * Returns orders with status COMPLETED
   */
  async getRefundableOrders(tenantId: string, params: RefundableOrdersParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause for refundable orders
    const where: Prisma.OrderWhereInput = {
      tenantId,
      status: {
        in: [OrderStatus.COMPLETED],
      },
      ...(params.branchId && { branchId: params.branchId }),
      ...(params.search && {
        OR: [
          { orderNumber: { contains: params.search, mode: 'insensitive' } },
          {
            customer: {
              name: { contains: params.search, mode: 'insensitive' },
            },
          },
        ],
      }),
      ...((params.dateFrom || params.dateTo) && {
        createdAt: {
          ...(params.dateFrom && { gte: new Date(params.dateFrom) }),
          ...(params.dateTo && { lte: new Date(params.dateTo) }),
        },
      }),
    };

    const [orders, totalCount] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          payments: { select: { method: true }, take: 1 },
          items: { select: { id: true } },
          refunds: { select: { id: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const data = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      completedAt: order.completedAt?.toISOString() || null,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      status: order.status,
      paymentMethod: order.payments[0]?.method || null,
      customerName: order.customer?.name || null,
      itemCount: order.items.length,
      hasRefunds: order.refunds.length > 0,
    }));

    return {
      data,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get refund history for a specific order
   */
  async getOrderRefundHistory(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const refunds = await this.prisma.refund.findMany({
      where: { orderId },
      include: {
        refundItems: {
          include: {
            orderItem: {
              include: {
                product: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { refundedAt: 'desc' },
    });

    return refunds.map((refund) => ({
      id: refund.id,
      refundedAt: refund.refundedAt.toISOString(),
      totalAmount: Number(refund.totalAmount),
      reason: refund.reason,
      items: refund.refundItems.map((item) => ({
        productName: String(item.orderItem?.product?.name || item.productName),
        quantity: Number(item.quantity),
        subtotal: Number(item.subtotal),
      })),
    }));
  }

  async getRefundableInfo(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // ✅ OPTIMIZED: Single batch query instead of N queries
    // Get all refunded quantities in ONE query using groupBy
    const refundedMap = await this.getRefundedQuantitiesMap(
      undefined,
      order.items.map((i) => i.id),
    );

    // Process items using pre-fetched refunded quantities
    const itemsWithRefundInfo = order.items.map((item) => {
      const refundedQuantity =
        refundedMap.get(item.id) ?? new Prisma.Decimal(0);
      const quantity = new Prisma.Decimal(item.quantity);
      const refundableQuantity = quantity.minus(refundedQuantity);

      return {
        orderItemId: item.id,
        productId: item.productId,
        productName: item.product?.name ?? 'Unknown',
        productSku: item.product?.sku ?? null,
        productImageUrl: item.product?.imageUrl ?? null,
        quantity: quantity.toNumber(),
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
        refundedQuantity: refundedQuantity.toNumber(),
        refundableQuantity: refundableQuantity.toNumber(),
      };
    });

    // Calculate total refundable amount
    const totalRefundable = itemsWithRefundInfo.reduce(
      (sum, item) => sum + item.refundableQuantity * item.unitPrice,
      0,
    );

    // Check if order can be refunded (COMPLETED)
    const canRefund = order.status === 'COMPLETED';

    // Check if fully refunded
    const isFullyRefunded = itemsWithRefundInfo.every(
      (item) => item.refundableQuantity <= 0,
    );

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      orderTotal: Number(order.total),
      canRefund,
      isFullyRefunded,
      totalRefundable,
      items: itemsWithRefundInfo,
    };
  }

  /**
   * Unified refund creation - routes to order-linked or manual refund
   * Now includes role-based validation for manager overrides
   */
  async createRefund(
    tenantId: string,
    userId: string,
    dto: CreateRefundDto,
    userRole?: string,
  ) {
    // Validate warnings and manager override if needed
    const validationResult = await this.validateRefund(
      tenantId,
      userRole ?? 'CASHIER',
      {
        orderId: dto.orderId,
        items: dto.items,
        manualRefund: dto.manualRefund,
        manualItems: dto.manualItems,
        branchId: dto.branchId,
      },
    );

    // Check if manager override is required but not provided
    if (validationResult.requiresManagerOverride && !dto.managerOverride) {
      const managerWarnings = validationResult.warnings
        .filter((w) => w.severity === WarningSeverity.MANAGER_REQUIRED)
        .map((w) => w.message);

      throw new ForbiddenException({
        message: 'Manager override required',
        warnings: managerWarnings,
        requiresManagerOverride: true,
      });
    }

    // Check if warnings were acknowledged
    const unacknowledgedWarnings = validationResult.warnings
      .filter((w) => w.severity === WarningSeverity.WARNING)
      .filter((w) => !dto.acknowledgedWarnings?.includes(w.code));

    if (unacknowledgedWarnings.length > 0) {
      throw new BadRequestException({
        message: 'Please acknowledge warnings before proceeding',
        warnings: unacknowledgedWarnings,
        requiresAcknowledgment: true,
      });
    }

    // Detect mode: manual refund vs order-linked refund
    const manualItems = dto.manualItems;
    const isManualRefund =
      dto.manualRefund === true &&
      Array.isArray(manualItems) &&
      manualItems.length > 0;

    if (isManualRefund) {
      return this.createManualRefund(tenantId, userId, dto);
    }

    return this.createOrderLinkedRefund(tenantId, userId, dto);
  }

  /**
   * Create a manual refund (no order reference)
   * Used for: gift returns, lost receipts, goodwill refunds
   */
  private async createManualRefund(
    tenantId: string,
    userId: string,
    dto: CreateRefundDto,
  ) {
    const {
      reason,
      branchId,
      restockInventory = true,
      isDamaged = false,
    } = dto;
    const manualItems = dto.manualItems ?? [];

    // If item is damaged, skip restocking
    const shouldRestock = restockInventory && !isDamaged;

    // Validate required fields for manual refund
    if (manualItems.length === 0) {
      throw new BadRequestException('Manual items are required');
    }
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Reason is required for manual refunds');
    }
    if (!branchId) {
      throw new BadRequestException('Branch is required for manual refunds');
    }

    // Validate branch exists and belongs to tenant
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, isDeleted: false },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Fetch and validate products
    const productIds = manualItems.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        tenantId,
        isDeleted: false,
      },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate all products exist
    for (const item of manualItems) {
      if (!productMap.has(item.productId)) {
        throw new BadRequestException(
          `Product ${item.productId} not found or inactive`,
        );
      }
    }

    // Calculate total and build refund items
    let totalRefundAmount = new Prisma.Decimal(0);
    const refundItemsData: Prisma.RefundItemCreateManyRefundInput[] = [];

    for (const item of manualItems) {
      const product = productMap.get(item.productId);
      if (!product) continue; // Already validated above

      const quantity = new Prisma.Decimal(item.quantity);
      const unitPrice = new Prisma.Decimal(item.unitPrice);
      const subtotal = quantity.mul(unitPrice);

      refundItemsData.push({
        productId: product.id,
        productName: product.name, // Snapshot for audit
        quantity: quantity.toFixed(4),
        unitPrice: unitPrice.toFixed(2),
        subtotal: subtotal.toFixed(2),
        orderItemId: null, // No order item reference
      });

      totalRefundAmount = totalRefundAmount.plus(subtotal);
    }

    // Create refund record (no transaction needed - no race condition risk)
    const refund = await this.prisma.refund.create({
      data: {
        orderId: null, // No order reference
        manualRefund: true,
        reason: reason.trim(),
        totalAmount: totalRefundAmount.toFixed(2),
        paymentMethod: null, // Can be set by frontend if needed
        refundedAt: new Date(),
        refundItems: {
          createMany: { data: refundItemsData },
        },
      },
      include: {
        refundItems: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    // Process inventory updates if requested and item not damaged
    if (shouldRestock) {
      for (const item of manualItems) {
        try {
          await this.inventoryTransactionService.executeTransaction({
            tenantId,
            branchId,
            productId: item.productId,
            userId,
            changeType: 'REFUND',
            quantity: item.quantity,
            reason: `Manual refund: ${reason}${isDamaged ? ' (damaged - no restock)' : ''}`,
            referenceId: refund.id,
            referenceType: 'REFUND',
          });
        } catch (error) {
          console.error(
            `Failed to update inventory for product ${item.productId}:`,
            error,
          );
          // Continue with other items - partial success is acceptable
        }
      }
    }

    return refund;
  }

  /**
   * Create an order-linked refund (existing flow)
   * Refunds items from a specific order with quantity tracking
   */
  private async createOrderLinkedRefund(
    tenantId: string,
    userId: string,
    dto: CreateRefundDto,
  ) {
    const {
      orderId,
      reason,
      items,
      restockInventory = true,
      isDamaged = false,
    } = dto;

    // If item is damaged, skip restocking
    const shouldRestock = restockInventory && !isDamaged;

    // Validate input
    if (!orderId) {
      throw new BadRequestException(
        'Order ID is required for order-linked refunds',
      );
    }
    if (!items || items.length === 0) {
      throw new BadRequestException('At least one item must be refunded');
    }

    // ✅ OPTIMIZED: Fetch and validate OUTSIDE transaction to minimize lock time
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!['COMPLETED'].includes(order.status)) {
      throw new BadRequestException(
        `Orders with status "${order.status}" cannot be refunded. Only COMPLETED orders can be refunded.`,
      );
    }

    if (!order.branchId) {
      throw new BadRequestException('Order must have a branch assigned');
    }

    const orderItemMap = new Map(order.items.map((i) => [i.id, i]));

    // Pre-fetch refunded quantities outside transaction
    const refundedMap = await this.getRefundedQuantitiesMap(
      undefined,
      items.map((i) => i.orderItemId),
    );

    let totalRefundAmount = new Prisma.Decimal(0);
    const refundItems: Prisma.RefundItemCreateManyRefundInput[] = [];

    // Pre-validate all items BEFORE starting transaction
    for (const item of items) {
      const orderItem = orderItemMap.get(item.orderItemId);

      if (!orderItem) {
        throw new BadRequestException(
          `Order item ${item.orderItemId} not found in this order`,
        );
      }

      const alreadyRefunded =
        refundedMap.get(orderItem.id) ?? new Prisma.Decimal(0);

      const refundableQty = new Prisma.Decimal(orderItem.quantity).minus(
        alreadyRefunded,
      );

      const requestedQty = new Prisma.Decimal(item.quantity);

      if (requestedQty.lessThanOrEqualTo(0)) {
        throw new BadRequestException(
          `Invalid refund quantity: ${item.quantity}. Quantity must be greater than 0.`,
        );
      }

      if (requestedQty.greaterThan(refundableQty)) {
        throw new BadRequestException(
          `Refund quantity exceeds available amount for "${orderItem.product?.name}". Available: ${refundableQty.toString()}, Requested: ${requestedQty.toString()}`,
        );
      }

      const unitPrice = new Prisma.Decimal(orderItem.unitPrice);
      const subtotal = requestedQty.mul(unitPrice);

      refundItems.push({
        orderItemId: orderItem.id,
        quantity: requestedQty.toFixed(4),
        unitPrice: unitPrice.toFixed(2),
        subtotal: subtotal.toFixed(2),
      });

      totalRefundAmount = totalRefundAmount.plus(subtotal);
    }

    // ✅ OPTIMIZED: Short transaction with retry logic (minimal lock time)
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const createdRefund = await this.prisma.$transaction(
          async (tx) => {
            // Double-check refunded quantities inside transaction for race conditions
            const refundedMapTx = await this.getRefundedQuantitiesMap(
              tx,
              items.map((i) => i.orderItemId),
            );

            // Quick validation inside transaction
            for (const item of items) {
              const orderItem = orderItemMap.get(item.orderItemId)!;
              const alreadyRefunded =
                refundedMapTx.get(orderItem.id) ?? new Prisma.Decimal(0);
              const refundableQty = new Prisma.Decimal(
                orderItem.quantity,
              ).minus(alreadyRefunded);
              const requestedQty = new Prisma.Decimal(item.quantity);

              if (requestedQty.greaterThan(refundableQty)) {
                throw new BadRequestException(
                  `Refund quantity changed. Available: ${refundableQty.toString()}, Requested: ${requestedQty.toString()}`,
                );
              }
            }

            // Create refund record
            const refund = await tx.refund.create({
              data: {
                orderId,
                reason: reason || null,
                totalAmount: totalRefundAmount.toFixed(2),
                refundedAt: new Date(),
                refundItems: {
                  createMany: { data: refundItems },
                },
              },
              include: { refundItems: true },
            });

            // ✅ Performance: Check if order is now fully refunded
            // Only runs if refund was created successfully
            const isFullyRefunded = await this.isOrderFullyRefunded(
              tx,
              orderId,
            );

            // ✅ Clean Code: Update order status if fully refunded
            // This happens within the same transaction for consistency
            if (isFullyRefunded) {
              await tx.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.FULLY_REFUNDED },
              });
            }

            return refund;
          },
          {
            maxWait: 5000,
            timeout: 10000,
          },
        );

        // Process inventory updates after successful transaction
        if (shouldRestock && createdRefund) {
          for (const item of items) {
            const orderItem = orderItemMap.get(item.orderItemId);
            if (orderItem) {
              try {
                await this.inventoryTransactionService.executeTransaction({
                  tenantId,
                  branchId: order.branchId,
                  productId: orderItem.productId,
                  userId,
                  changeType: 'REFUND',
                  quantity: item.quantity,
                  reason: `Refund: ${reason || `Order ${orderId}`}${isDamaged ? ' (damaged - no restock)' : ''}`,
                  referenceId: createdRefund.id,
                  referenceType: 'REFUND',
                });
              } catch (error) {
                console.error(
                  `Failed to update inventory for product ${orderItem.productId}:`,
                  error,
                );
                // Continue with other items - partial success is acceptable
              }
            }
          }
        }

        return createdRefund;
      } catch (error) {
        console.error(
          `Refund transaction attempt ${attempt + 1} failed:`,
          error,
        );
      }
    }

    throw new Error('Transaction failed after retries');
  }

  /**
   * Process inventory updates for refunded items
   * This is called separately to avoid transaction conflicts
   * @deprecated Use restockInventory flag in createRefund instead
   */
  async executeInventoryRefunds(
    tenantId: string,
    orderId: string,
    userId: string,
    refundItems: Array<{
      orderItemId: string;
      quantity: number;
      productId: string;
    }>,
    reason?: string,
  ): Promise<void> {
    // Execute inventory updates sequentially to avoid conflicts
    for (const item of refundItems) {
      try {
        await this.inventoryTransactionService.executeTransaction({
          tenantId,
          branchId: '', // Will be resolved by the service
          productId: item.productId,
          userId,
          changeType: 'REFUND',
          quantity: item.quantity,
          reason: `Refund: ${reason || `Order ${orderId}`}`,
          referenceId: orderId,
          referenceType: 'REFUND',
          allowNegativeStock: false,
        });
      } catch (error) {
        console.error(
          `Failed to update inventory for product ${item.productId}:`,
          error,
        );
        // Continue with other items to ensure partial success
      }
    }
  }

  private async getAlreadyRefundedQuantity(orderItemId: string) {
    const result = await this.prisma.refundItem.aggregate({
      where: { orderItemId },
      _sum: { quantity: true },
    });
    return new Prisma.Decimal(result._sum.quantity || 0);
  }

  async findAll(
    tenantId: string,
    params: {
      from?: string;
      to?: string;
      productId?: string;
      orderId?: string;
    },
  ) {
    const { from, to, productId, orderId } = params;

    const where: Prisma.RefundWhereInput = {
      order: {
        tenantId,
        ...(orderId && { id: orderId }),
      },
      ...((from || to) && {
        refundedAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
      ...(productId && {
        refundItems: {
          some: {
            orderItem: {
              productId,
            },
          },
        },
      }),
    };

    const refunds = await this.prisma.refund.findMany({
      where,
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        refundItems: {
          include: {
            orderItem: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        refundedAt: 'desc',
      },
    });

    return refunds;
  }

  private async getRefundedQuantitiesMap(
    tx: Prisma.TransactionClient | undefined,
    orderItemIds: string[],
  ) {
    const client = tx ?? this.prisma;
    const rows = await client.refundItem.groupBy({
      by: ['orderItemId'],
      where: { orderItemId: { in: orderItemIds } },
      _sum: { quantity: true },
    });

    return new Map(
      rows.map((r) => [
        r.orderItemId,
        new Prisma.Decimal(r._sum.quantity ?? 0),
      ]),
    );
  }

  /**
   * ✅ PERFORMANCE: Check if order is fully refunded
   * Uses aggregation query (single DB call) instead of fetching all items
   * Returns true only if ALL items have been fully refunded
   */
  private async isOrderFullyRefunded(
    tx: Prisma.TransactionClient | undefined,
    orderId: string,
  ): Promise<boolean> {
    const client = tx ?? this.prisma;

    // Get order with item quantities
    const order = await client.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        items: {
          select: {
            id: true,
            quantity: true,
          },
        },
      },
    });

    if (!order || order.items.length === 0) return false;

    // Get total refunded quantity per item in single query
    const refundedItems = await client.refundItem.groupBy({
      by: ['orderItemId'],
      where: {
        orderItem: {
          orderId,
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const refundedMap = new Map(
      refundedItems.map((r) => [
        r.orderItemId,
        new Prisma.Decimal(r._sum.quantity ?? 0),
      ]),
    );

    // Check if every item is fully refunded
    return order.items.every((item) => {
      const refundedQty = refundedMap.get(item.id) ?? new Prisma.Decimal(0);
      const originalQty = new Prisma.Decimal(item.quantity);
      return refundedQty.equals(originalQty);
    });
  }
}
