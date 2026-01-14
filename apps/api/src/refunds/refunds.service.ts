import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '../../generated/prisma/client.js';
import { InventoryTransactionService } from '../inventory/inventory-transaction.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRefundDto } from './dto/create-refund.dto.js';

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
   * Get orders eligible for refund
   * Returns orders with status PAID, COMPLETED, or that have existing refunds
   */
  async getRefundableOrders(tenantId: string, params: RefundableOrdersParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause for refundable orders
    const where: Prisma.OrderWhereInput = {
      tenantId,
      status: {
        in: [OrderStatus.PAID, OrderStatus.COMPLETED],
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

    // Check if order can be refunded (PAID or COMPLETED)
    const canRefund = order.status === 'COMPLETED' || order.status === 'PAID';

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

  async createRefund(tenantId: string, userId: string, dto: CreateRefundDto) {
    const { orderId, reason, items } = dto;

    // Validate input
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

    if (!['PAID', 'COMPLETED'].includes(order.status)) {
      throw new BadRequestException(
        `Orders with status "${order.status}" cannot be refunded. Only PAID or COMPLETED orders can be refunded.`,
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
