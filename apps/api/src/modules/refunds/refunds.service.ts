import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CashMovementReferenceType,
  CashMovementType,
  LoyaltyDirection,
  LoyaltyTransactionType,
  OrderStatus,
  ShiftStatus,
} from '@repo/types';
import { PaymentMethod, Prisma } from '../../generated/prisma/client.js';
import { LoyaltyMath } from '../../utils/loyalty-math.util.js';
import { InventoryTransactionService } from '../inventory/inventory-transaction.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShiftsService } from '../shifts/shifts.service.js';
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
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryTransactionService: InventoryTransactionService,
    private readonly loyaltyService: LoyaltyService,
    private readonly shiftsService: ShiftsService,
  ) {}

  private isIdempotencyUniqueError(error: unknown): boolean {
    if (
      !(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
    ) {
      return false;
    }

    const target = (error.meta as { target?: unknown } | undefined)?.target;
    if (Array.isArray(target)) {
      return target.includes('idempotencyKey');
    }
    if (typeof target === 'string') {
      return target.includes('idempotencyKey');
    }
    return false;
  }

  private async findIdempotentRefund(tenantId: string, idempotencyKey: string) {
    return this.prisma.refund.findFirst({
      where: { tenantId, idempotencyKey },
      include: { refundItems: true },
    });
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
      ...(params.status && {
        status: {
          in: [params.status as OrderStatus].filter(Boolean),
        },
      }),
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
      include: {
        items: true,
      },
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
      isPartialRefund: refund.refundItems.length < order.items.length,
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

    // Check if order can be refunded (COMPLETED or PARTIALLY_REFUNDED)
    const canRefund =
      order.status === 'COMPLETED' || order.status === 'PARTIALLY_REFUNDED';

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

    // ── Idempotency check (tenant-scoped) ───────────────────────────────
    if (dto.idempotencyKey) {
      const existing = await this.findIdempotentRefund(
        tenantId,
        dto.idempotencyKey,
      );
      if (existing) {
        return existing; // Return cached result for idempotent retry
      }
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
        refunds: {
          select: {
            loyaltyPointsRestored: true,
            loyaltyPointsReversed: true,
            refundItems: {
              select: { subtotal: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        `Orders with status "${order.status}" cannot be refunded. Only COMPLETED or PARTIALLY_REFUNDED orders can be refunded.`,
      );
    }

    if (!order.branchId) {
      throw new BadRequestException('Order must have a branch assigned');
    }

    // ── Resolve shift context (best-effort, with order branchId) ──────────
    let resolvedShiftId = dto.shiftId || null;
    let resolvedDeviceId = dto.deviceId || null;

    if (resolvedShiftId) {
      const shift = await this.prisma.shift.findFirst({
        where: { id: resolvedShiftId, tenantId },
        select: { branchId: true, deviceId: true, status: true },
      });
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }
      if (shift.branchId !== order.branchId) {
        throw new BadRequestException(
          'Shift does not belong to the order branch',
        );
      }
      if (
        resolvedDeviceId &&
        shift.deviceId &&
        shift.deviceId !== resolvedDeviceId
      ) {
        throw new BadRequestException('Device does not match the shift device');
      }
      if (shift.status !== ShiftStatus.OPEN) {
        throw new BadRequestException(
          'Cannot process refund on a closed shift',
        );
      }
    }

    if (!resolvedShiftId) {
      try {
        const currentShift = await this.shiftsService.getCurrentShift(
          tenantId,
          resolvedDeviceId || undefined,
          order.branchId || undefined,
        );
        if (currentShift) {
          resolvedShiftId = currentShift.id;
          resolvedDeviceId = resolvedDeviceId || currentShift.deviceId;
        }
      } catch {
        // Shift resolution is best-effort; don't block refund
      }
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
          `Cannot refund ${requestedQty.toString()} of "${orderItem.product?.name}". ` +
            `Only ${refundableQty.toString()} available for refund ` +
            `(${item.quantity > 0 ? alreadyRefunded.toString() + ' already refunded' : 'not yet refunded'})`,
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
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const createdRefund = await this.prisma.$transaction(
          async (tx) => {
            // Double-check refunded quantities inside transaction for race conditions
            const refundedMapTx = await this.getRefundedQuantitiesMap(
              tx,
              items.map((i) => i.orderItemId),
            );

            if (resolvedShiftId) {
              const shift = await tx.shift.findFirst({
                where: { id: resolvedShiftId, tenantId },
                select: { branchId: true, deviceId: true, status: true },
              });
              if (!shift) {
                throw new NotFoundException('Shift not found');
              }
              if (shift.branchId !== order.branchId) {
                throw new BadRequestException(
                  'Shift does not belong to the order branch',
                );
              }
              if (
                resolvedDeviceId &&
                shift.deviceId &&
                shift.deviceId !== resolvedDeviceId
              ) {
                throw new BadRequestException(
                  'Device does not match the shift device',
                );
              }
              if (shift.status !== ShiftStatus.OPEN) {
                throw new BadRequestException(
                  'Cannot process refund on a closed shift',
                );
              }
            }

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

            // Create refund record with attribution
            const refund = await tx.refund.create({
              data: {
                orderId,
                reason: reason || null,
                totalAmount: totalRefundAmount.toFixed(2),
                refundedAt: new Date(),
                // ── Shift attribution ──
                tenantId,
                branchId: order.branchId,
                shiftId: resolvedShiftId || undefined,
                deviceId: resolvedDeviceId || undefined,
                userId,
                idempotencyKey: dto.idempotencyKey || undefined,
                refundItems: {
                  createMany: { data: refundItems },
                },
              },
              include: { refundItems: true },
            });

            /* ── Loyalty adjustments ─────────────────────────────── */
            let loyaltyPointsRestored = 0;
            let loyaltyPointsReversed = 0;
            const hasLoyalty =
              order.loyaltyRedeemedPoints > 0 || order.loyaltyEarnedPoints > 0;

            if (hasLoyalty && order.customerId) {
              const priorRefundedAmount = order.refunds.reduce(
                (sum, r) =>
                  sum.plus(
                    r.refundItems.reduce(
                      (s, ri) => s.plus(LoyaltyMath.toDecimal(ri.subtotal)),
                      new Prisma.Decimal(0),
                    ),
                  ),
                new Prisma.Decimal(0),
              );
              const eligibleRefundedAmountAfter =
                priorRefundedAmount.plus(totalRefundAmount);

              const alreadyRestored = order.refunds.reduce(
                (sum, r) => sum + r.loyaltyPointsRestored,
                0,
              );
              const alreadyReversed = order.refunds.reduce(
                (sum, r) => sum + r.loyaltyPointsReversed,
                0,
              );

              const adjustments = LoyaltyMath.computeRefundLoyaltyAdjustments({
                eligibleRefundedAmountAfter,
                loyaltyEligibleBaseAtCompletion:
                  order.loyaltyEligibleBaseAtCompletion,
                loyaltyRedeemedPoints: order.loyaltyRedeemedPoints,
                loyaltyEarnedPoints: order.loyaltyEarnedPoints,
                alreadyRestored,
                alreadyReversed,
              });

              loyaltyPointsRestored = adjustments.incrementRestore;
              loyaltyPointsReversed = adjustments.incrementReverse;

              if (loyaltyPointsRestored > 0 || loyaltyPointsReversed > 0) {
                await tx.refund.update({
                  where: { id: refund.id },
                  data: {
                    loyaltyPointsRestored,
                    loyaltyPointsReversed,
                  },
                });
              }
            }

            /* ============================================
               CREATE REFUND PAYMENT RECORDS
            ============================================ */
            if (dto.refundPayments && dto.refundPayments.length > 0) {
              const refundPaymentsBaseTotal = dto.refundPayments.reduce(
                (sum, rp) => {
                  const exchangeRate = rp.exchangeRate || 1;
                  return sum + Math.round(rp.amount * exchangeRate * 100) / 100;
                },
                0,
              );
              const tolerance = 0.02;
              if (
                Math.abs(
                  refundPaymentsBaseTotal - totalRefundAmount.toNumber(),
                ) > tolerance
              ) {
                throw new BadRequestException(
                  `Refund payment total (${refundPaymentsBaseTotal.toFixed(2)}) does not match computed refund amount (${totalRefundAmount.toFixed(2)})`,
                );
              }

              await Promise.all(
                dto.refundPayments.map((rp) => {
                  const exchangeRate = rp.exchangeRate || 1;
                  const amountInBase =
                    Math.round(rp.amount * exchangeRate * 100) / 100;

                  return tx.refundPayment.create({
                    data: {
                      refundId: refund.id,
                      method: rp.method as PaymentMethod,
                      amount: new Prisma.Decimal(amountInBase),
                      currencyCode: rp.currencyCode,
                      exchangeRate: rp.exchangeRate
                        ? new Prisma.Decimal(rp.exchangeRate)
                        : undefined,
                      shiftId: resolvedShiftId || undefined,
                      deviceId: resolvedDeviceId || undefined,
                      userId,
                    },
                  });
                }),
              );

              if (resolvedShiftId && order.branchId) {
                const cashRefundPayments = dto.refundPayments.filter(
                  (rp) => rp.method === 'CASH',
                );

                if (cashRefundPayments.length > 0) {
                  await Promise.all(
                    cashRefundPayments.map((crp) => {
                      const exchangeRate = crp.exchangeRate || 1;
                      const amountInBase =
                        Math.round(crp.amount * exchangeRate * 100) / 100;

                      return tx.cashMovement.create({
                        data: {
                          tenantId,
                          branchId: order.branchId,
                          shiftId: resolvedShiftId ?? '',
                          deviceId: resolvedDeviceId || undefined,
                          userId,
                          type: CashMovementType.CASH_REFUND_OUT,
                          amount: new Prisma.Decimal(amountInBase),
                          reason: `Refund for order ${orderId}`,
                          referenceId: refund.id,
                          referenceType: CashMovementReferenceType.REFUND,
                        },
                      });
                    }),
                  );
                }
              }
            }

            // ✅ Performance: Check if order is now fully refunded
            // Uses data already available (no extra DB queries)
            const requestedMap = new Map(
              items.map((i) => [i.orderItemId, new Prisma.Decimal(i.quantity)]),
            );
            const isFullyRefunded = order.items.every((item) => {
              const alreadyRefunded =
                refundedMapTx.get(item.id) ?? new Prisma.Decimal(0);
              const nowRefunding =
                requestedMap.get(item.id) ?? new Prisma.Decimal(0);
              const totalRefunded = alreadyRefunded.plus(nowRefunding);
              return totalRefunded.greaterThanOrEqualTo(
                new Prisma.Decimal(item.quantity),
              );
            });

            // Update order status based on refund state
            if (isFullyRefunded) {
              await tx.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.FULLY_REFUNDED },
              });
            } else {
              // Check if this is the first refund or additional partial refund
              const hasAnyRefunds = refund.refundItems.length > 0;
              if (hasAnyRefunds && order.status === OrderStatus.COMPLETED) {
                await tx.order.update({
                  where: { id: orderId },
                  data: { status: OrderStatus.PARTIALLY_REFUNDED },
                });
              }
            }

            return {
              ...refund,
              loyaltyPointsRestored,
              loyaltyPointsReversed,
              _customerId: order.customerId,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        // ── Post-commit: Loyalty ledger entries ────────────────
        if (createdRefund._customerId) {
          if (createdRefund.loyaltyPointsRestored > 0) {
            try {
              await this.loyaltyService.applyLedgerEntry({
                tenantId,
                customerId: createdRefund._customerId,
                orderId,
                refundId: createdRefund.id,
                type: LoyaltyTransactionType.REFUND_RESTORE_REDEEM,
                direction: LoyaltyDirection.CREDIT,
                points: createdRefund.loyaltyPointsRestored,
                idempotencyKey: `refund:${createdRefund.id}:restore`,
                reason: reason || 'Refund restore redeemed points',
                actorUserId: userId,
              });
            } catch (err) {
              this.logger.error(
                `[createRefund] Loyalty restore failed for refund ${createdRefund.id}:`,
                err,
              );
            }
          }

          if (createdRefund.loyaltyPointsReversed > 0) {
            try {
              await this.loyaltyService.applyLedgerEntry({
                tenantId,
                customerId: createdRefund._customerId,
                orderId,
                refundId: createdRefund.id,
                type: LoyaltyTransactionType.REFUND_REVERSE_EARN,
                direction: LoyaltyDirection.DEBIT,
                points: createdRefund.loyaltyPointsReversed,
                idempotencyKey: `refund:${createdRefund.id}:reverse`,
                reason: reason || 'Refund reverse earned points',
                actorUserId: userId,
              });
            } catch (err) {
              this.logger.error(
                `[createRefund] Loyalty reverse failed for refund ${createdRefund.id}:`,
                err,
              );
            }
          }
        }

        // Strip internal flags
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _customerId, ...result } = createdRefund;
        return result;
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }

        if (dto.idempotencyKey && this.isIdempotencyUniqueError(error)) {
          const existing = await this.findIdempotentRefund(
            tenantId,
            dto.idempotencyKey,
          );
          if (existing) {
            return existing;
          }
        }

        const isPrismaConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (isPrismaConflict && attempt < MAX_RETRIES) {
          await new Promise((r) =>
            setTimeout(r, 50 * Math.pow(3, attempt - 1)),
          );
          continue;
        }

        throw error;
      }
    }

    throw new BadRequestException('Failed to create refund after retries');
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
}
