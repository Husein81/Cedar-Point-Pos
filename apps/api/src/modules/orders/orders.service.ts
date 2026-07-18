import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ACTIVE_ORDER_STATUSES,
  BusinessType,
  CashMovementReferenceType,
  CashMovementType,
  EDITABLE_ORDER_STATUSES,
  LoyaltyDirection,
  LoyaltyTransactionType,
  OrderStatus,
  OrderType,
  PaymentStatus,
  QueryParams,
  ShiftStatus,
  TicketStatus,
  UserRole,
} from '@repo/types';
import { PaymentMethod, Prisma } from '../../generated/prisma/client.js';
import {
  assertRoleCanTransition,
  assertTransition,
} from './order-status.js';
import { LoyaltyMath } from '../../utils/loyalty-math.util.js';
import { InventoryDeductionService } from '../inventory/inventory-deduction.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { OffersService } from '../offers/offers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TableStatusService } from '../tables/table-status.service.js';
import type { AddItemDto } from './dto/add-item.dto.js';
import type { AddOfferItemsDto } from './dto/add-offer-items.dto.js';
import type { CreateOrderDto, PaymentDto } from './dto/create-order.dto.js';
import type { SplitOrderItemDto } from './dto/split-order.dto.js';

type OrderQueryParams = QueryParams & {
  status?: OrderStatus;
  branchId?: string;
  userId?: string;
  type?: OrderType;
  startDate?: string;
  endDate?: string;
  tableId?: string;
};

const VAT_RATE = 0.11; // 11% VAT

function formatOrderDate(date: Date): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getBranchCode(branchName: string): string {
  return branchName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 3);
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryDeductionService: InventoryDeductionService,
    private readonly tableStatusService: TableStatusService,
    private readonly loyaltyService: LoyaltyService,
    private readonly offersService: OffersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private round(v: number) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  private isIdempotencyUniqueError(error: unknown): boolean {
    if (!(
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )) {
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

  private async buildIdempotentPaymentResponse(
    tenantId: string,
    orderId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: {
        total: true,
        status: true,
        currencyCode: true,
        payments: {
          select: {
            amount: true,
            method: true,
            currencyCode: true,
            exchangeRate: true,
          },
        },
      },
    });

    const totalDue = this.money(Number(order?.total || 0));
    const allPayments = order?.payments || [];
    const totalPaid = this.money(
      allPayments.reduce((s, p) => s + Number(p.amount), 0),
    );
    const changeBase = Math.max(0, totalPaid - totalDue);
    const firstCash = allPayments.find((p) => p.method === PaymentMethod.CASH);
    const changeCurrency =
      firstCash?.currencyCode || order?.currencyCode || 'USD';
    const changeRate = firstCash ? Number(firstCash.exchangeRate || 1) : 1;

    return {
      orderId,
      status: order?.status || OrderStatus.PLACED,
      paymentStatus: this.derivePaymentStatus(totalPaid, totalDue),
      totalDue,
      paid: this.money(Math.min(totalPaid, totalDue)),
      remaining: this.money(Math.max(0, totalDue - totalPaid)),
      change: {
        amount: this.money(changeBase / changeRate),
        currency: changeCurrency,
      },
      paymentCount: allPayments.length,
      idempotent: true,
    };
  }

  /**
   * Payment axis derivation — the ONLY way paymentStatus is computed.
   * Refund states are written exclusively by RefundsService.
   */
  private derivePaymentStatus(
    paidBase: number,
    totalDue: number,
  ): PaymentStatus {
    if (totalDue <= 0) return PaymentStatus.PAID;
    if (paidBase <= 0) return PaymentStatus.UNPAID;
    if (paidBase >= totalDue) return PaymentStatus.PAID;
    return PaymentStatus.PARTIALLY_PAID;
  }

  /** Audit row for a fulfillment transition; call inside the same tx. */
  private async recordTransition(
    tx: Prisma.TransactionClient,
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    userId?: string | null,
  ) {
    if (from === to) return;
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        from,
        to,
        userId: userId && userId !== 'SYSTEM' ? userId : null,
      },
    });
  }

  private async validateShiftAndDevice({
    tenantId,
    branchId,
    shiftId,
    deviceId,
  }: {
    tenantId: string;
    branchId: string;
    shiftId?: string | null;
    deviceId?: string | null;
  }) {
    if (!shiftId && !deviceId) return;

    if (shiftId) {
      const shift = await this.prisma.shift.findFirst({
        where: { id: shiftId, tenantId },
        select: { branchId: true, deviceId: true },
      });
      if (!shift) {
        throw new NotFoundException('Shift not found or not accessible');
      }
      if (shift.branchId !== branchId) {
        throw new BadRequestException(
          'Shift does not belong to the order branch',
        );
      }
      // If caller also passed deviceId, it must match the shift's device
      if (deviceId && shift.deviceId && shift.deviceId !== deviceId) {
        throw new BadRequestException('Device does not match the shift device');
      }
    }

    if (deviceId) {
      const device = await this.prisma.pOSDevice.findFirst({
        where: { id: deviceId, tenantId },
        select: { branchId: true },
      });
      if (!device) {
        throw new NotFoundException('Device not found or not accessible');
      }
      if (device.branchId !== branchId) {
        throw new BadRequestException(
          'Device does not belong to the order branch',
        );
      }
    }
  }

  async create(
    { tenantId, userId }: { tenantId: string; userId: string },
    dto: CreateOrderDto,
  ) {
    const {
      branchId,
      type,
      tableId,
      customerId,
      items,
      discount,
      shippingFee,
      includeVAT,
      guestCount,
      shiftId,
      deviceId,
    } = dto;

    // Fetch tenant info
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessType: true },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    if (
      tenant.businessType === BusinessType.RESTAURANT &&
      ![
        OrderType.DINE_IN,
        OrderType.TAKEAWAY,
        OrderType.DELIVERY,
        OrderType.RETAIL,
      ].includes(type)
    ) {
      throw new BadRequestException('Invalid order type for restaurant');
    }

    // Enforce one active order per table for dine-in
    if (tableId && type === OrderType.DINE_IN) {
      const existingActive = await this.tableStatusService.hasActiveOrders(
        tableId,
        tenantId,
      );
      if (existingActive) {
        throw new ConflictException({
          message: 'This table already has an active order',
          code: 'TABLE_HAS_ACTIVE_ORDER',
        });
      }
    }

    let subtotal = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    if (items?.length) {
      const allModifierIds = items
        .filter((i) => i.modifiers?.length)
        .flatMap((i) => i.modifiers || []);

      const [products, modifiers] = (await Promise.all([
        this.prisma.product.findMany({
          where: {
            id: { in: items.map((i) => i.productId) },
            tenantId,
            deletedAt: null,
          },
          select: {
            id: true,
            price: true,
          },
        }),
        allModifierIds.length > 0
          ? this.prisma.modifier.findMany({
              where: {
                id: { in: allModifierIds },
                tenantId,
                deletedAt: null,
              },
            })
          : [],
      ])) as [
        Prisma.ProductGetPayload<{
          select: { id: true; price: true };
        }>[],
        Prisma.ModifierGetPayload<object>[],
      ];

      const productMap = new Map(products.map((p) => [p.id, p]));
      const modifierMap = new Map(modifiers.map((m) => [m.id, m]));

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) throw new BadRequestException('Product not found');

        const unitPrice =
          'unitPrice' in item && typeof item.unitPrice === 'number'
            ? item.unitPrice
            : Number(product.price);

        // Calculate modifier prices
        let modifiersTotal = 0;
        const itemModifiers: { modifierId: string; price: number }[] = [];

        if (item.modifiers?.length) {
          for (const modifierId of item.modifiers) {
            const modifier = modifierMap.get(modifierId);
            if (modifier) {
              const modifierPrice = Number(modifier.price);
              modifiersTotal += modifierPrice;
              itemModifiers.push({
                modifierId,
                price: modifierPrice,
              });
            }
          }
        }

        let lineSubtotal = (unitPrice + modifiersTotal) * item.quantity;

        const discount =
          'discount' in item && item.discount !== null ? item.discount : null;
        if (
          discount &&
          typeof discount === 'object' &&
          'type' in discount &&
          'value' in discount
        ) {
          const discountAmount =
            discount.type === 'PERCENTAGE'
              ? (lineSubtotal * Number(discount.value)) / 100
              : Number(discount.value);
          lineSubtotal -= discountAmount;
        }

        subtotal += lineSubtotal;

        const discountValue =
          discount && typeof discount === 'object'
            ? {
                type: discount.type,
                value: discount.value,
              }
            : undefined;

        orderItems.push({
          product: { connect: { id: product.id } },
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(unitPrice),
          subtotal: new Prisma.Decimal(lineSubtotal),
          total: new Prisma.Decimal(lineSubtotal),
          notes: item.notes,
          discount: discountValue,
          // Create modifiers for this order item
          ...(itemModifiers.length > 0 && {
            modifiers: {
              create: itemModifiers.map((m) => ({
                modifier: { connect: { id: m.modifierId } },
                price: new Prisma.Decimal(m.price),
              })),
            },
          }),
        });
      }
    }

    subtotal = this.round(subtotal);

    if (discount && discount > subtotal) {
      throw new BadRequestException('Order discount cannot exceed subtotal');
    }

    const orderType =
      shippingFee && shippingFee > 0 ? OrderType.DELIVERY : type;

    const subtotalAfterDiscountAndShipping = this.round(
      Math.max(0, Number(subtotal) - (discount || 0) + (shippingFee || 0)),
    );
    const vatAmount = includeVAT
      ? this.round(subtotalAfterDiscountAndShipping * VAT_RATE)
      : 0;

    const total = this.round(subtotalAfterDiscountAndShipping + vatAmount);

    await this.validateShiftAndDevice({
      tenantId,
      branchId,
      shiftId,
      deviceId,
    });

    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { name: true },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const dateStr = formatOrderDate(new Date());
    const branchCode = getBranchCode(branch.name);

    try {
      const createdOrder = await this.prisma.$transaction(async (tx) => {
        // fetch/upsert sequence
        const sequence = await tx.orderSequence.upsert({
          where: { branchId_date: { branchId, date: dateStr } },
          update: { lastValue: { increment: 1 } },
          create: { tenantId, branchId, date: dateStr, lastValue: 1 },
        });

        const seqStr = sequence.lastValue.toString().padStart(4, '0');
        const orderNumber = `${dateStr}-${branchCode}-${seqStr}`;

        // Create the order
        const order = await tx.order.create({
          data: {
            tenantId,
            branchId,
            userId,
            orderNumber,
            type: orderType,
            status: OrderStatus.DRAFT,
            total,
            subtotal,
            discount: discount ?? 0,
            shippingFee: shippingFee ?? 0,
            includeVAT: includeVAT ?? false,
            vat: vatAmount,
            ...(tableId && { tableId }),
            ...(customerId && { customerId }),
            ...(shiftId && { shiftId }),
            ...(deviceId && { deviceId }),
            ...(guestCount && { guestCount }),
            items: { create: orderItems },
          },
          include: {
            items: {
              include: {
                product: true,
                modifiers: {
                  include: { modifier: true },
                },
              },
            },
          },
        });

        // Auto-update table status to OCCUPIED if tableId provided
        if (tableId) {
          // Validate table and update status if needed
          await this.tableStatusService.markTableOccupiedIfNeeded(
            tableId,
            tenantId,
            tx,
            guestCount,
          );
        }

        return order;
      });

      // Post-commit: notify the branch floor plan (never inside the tx).
      if (tableId) {
        this.eventEmitter.emit('table.updated', { branchId });
      }

      return createdOrder;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Reconcile sequence outside the failed transaction
        const prefix = `${dateStr}-${branchCode}-`;
        const latestOrder = await this.prisma.order.findFirst({
          where: { branchId, orderNumber: { startsWith: prefix } },
          orderBy: { orderNumber: 'desc' },
        });

        if (latestOrder && latestOrder.orderNumber) {
          const parts = latestOrder.orderNumber.split('-');
          const lastNum = parseInt(parts[parts.length - 1] || '0', 10);
          if (!isNaN(lastNum)) {
            await this.prisma.orderSequence.upsert({
              where: { branchId_date: { branchId, date: dateStr } },
              update: { lastValue: lastNum }, // Next attempt will increment it
              create: {
                tenantId,
                branchId,
                date: dateStr,
                lastValue: lastNum,
              },
            });
          }
        }
      }

      console.error(error);
      throw error;
    }
  }

  async findOne(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          include: {
            product: true,
            modifiers: {
              include: { modifier: true },
            },
            refundItems: true,
          },
        },
        user: true,
        table: true,
        refunds: true,
        payments: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getNextOrderNumber(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { name: true },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const dateStr = formatOrderDate(new Date());
    const branchCode = getBranchCode(branch.name);

    const sequence = await this.prisma.orderSequence.findUnique({
      where: {
        branchId_date: {
          branchId,
          date: dateStr,
        },
      },
    });

    const nextValue = (sequence?.lastValue || 0) + 1;
    const seqStr = nextValue.toString().padStart(4, '0');
    const orderNumber = `${dateStr}-${branchCode}-${seqStr}`;
    return { orderNumber };
  }

  async findAll(tenantId: string, params: OrderQueryParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(params.status && { status: params.status }),
      ...(params.branchId && { branchId: params.branchId }),
      ...(params.type && { type: params.type }),
      ...(params.tableId && { tableId: params.tableId }),
      ...(params.search && {
        id: params.search,
      }),
    };

    const [totalCount, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: true,
              modifiers: {
                include: { modifier: true },
              },
              refundItems: true,
            },
          },
          payments: true,
          customer: true,
          table: true,
          refunds: true,
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async updateStatus({
    tenantId,
    orderId,
    nextStatus,
    userId,
    actorRole,
  }: {
    tenantId: string;
    orderId: string;
    nextStatus: OrderStatus;
    userId: string;
    actorRole?: UserRole;
  }) {
    // Phase 1: Atomic status update + table status
    const updated = await this.prisma.$transaction(async (tx) => {
      // Get order with table info
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        select: {
          status: true,
          paymentStatus: true,
          tableId: true,
          branchId: true,
          total: true,
          loyaltyRedeemedAmount: true,
          tenant: { select: { businessType: true } },
          payments: { select: { amount: true } },
        },
      });

      if (!order) throw new NotFoundException('Order not found');

      assertTransition(order.tenant.businessType, order.status, nextStatus);
      if (actorRole) {
        assertRoleCanTransition(actorRole, order.status, nextStatus);
      }

      // Guard: an order must be fully paid before it can be COMPLETED.
      // Applies to BOTH business types — unpaid closures are an explicit
      // manager CANCELLED (write-off), never a silent unpaid completion.
      //
      // Trust the derived paymentStatus (set authoritatively by the payment
      // flow) rather than re-deriving from raw Decimal sums here — the two
      // used different rounding, so a genuinely-paid order could round to
      // PAID on the payment axis yet fail a full-precision `<` recheck.
      // A fully-comped order (nothing due, e.g. 100% loyalty) is settled by
      // definition even if no payment row was ever written.
      if (nextStatus === OrderStatus.COMPLETED) {
        const loyaltyDiscount =
          order.loyaltyRedeemedAmount ?? new Prisma.Decimal(0);
        const nothingDue = order.total.sub(loyaltyDiscount).lte(0);
        if (order.paymentStatus !== PaymentStatus.PAID && !nothingDue) {
          throw new BadRequestException({
            message:
              'Order cannot be completed: payment has not been fully settled',
            code: 'ORDER_NOT_PAID',
          });
        }
      }

      // Update order status (+ lifecycle timestamps)
      const now = new Date();
      const result = await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          ...(nextStatus === OrderStatus.PLACED && { placedAt: now }),
          ...(nextStatus === OrderStatus.SERVED && { servedAt: now }),
          ...(nextStatus === OrderStatus.COMPLETED && { completedAt: now }),
        },
      });

      await this.recordTransition(tx, orderId, order.status, nextStatus, userId);

      // Auto-update table status when order completed/cancelled
      if (
        order.tableId &&
        (nextStatus === OrderStatus.COMPLETED ||
          nextStatus === OrderStatus.CANCELLED)
      ) {
        // Mark table as AVAILABLE if no other active orders exist
        await this.tableStatusService.markTableAvailableIfPossible(
          order.tableId,
          orderId,
          tenantId,
          tx,
        );
      }

      return { ...result, _branchId: order.branchId };
    });

    if (nextStatus === OrderStatus.COMPLETED) {
      await this.inventoryDeductionService.deductStockForOrder(
        tenantId,
        orderId,
        updated._branchId,
        userId,
      );

      // Phase 3: Loyalty earn on completion
      await this.earnLoyaltyPoints(tenantId, orderId, userId);
    }

    // Emit event for real-time kitchen updates
    this.eventEmitter.emit('kitchen.order.updated', {
      branchId: updated._branchId,
      orderId: updated.id,
    });

    // Any status change on a table-bound order affects the floor plan
    // (PREPARING/READY/BILLING badges derive from order status).
    if (updated.tableId) {
      this.eventEmitter.emit('table.updated', { branchId: updated._branchId });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _branchId, ...result } = updated;
    return result;
  }

  async processPayment(
    tenantId: string,
    orderId: string,
    paymentsInput: {
      payments?: Array<{
        amount: number;
        method: PaymentMethod;
        currencyCode?: string;
        exchangeRate?: number;
      }>;
      amount?: number;
      method?: PaymentMethod;
      currencyCode?: string;
      exchangeRate?: number;
      loyalty?: { redeemPoints: number };
      // Shift attribution (optional for backward compat)
      shiftId?: string;
      deviceId?: string;
      idempotencyKey?: string;
    },
    userId: string,
  ) {
    // ✅ Handle backwards compatibility: convert single payment to array
    let payments: Array<{
      amount: number;
      method: PaymentMethod;
      currencyCode?: string;
      exchangeRate?: number;
    }>;

    if (paymentsInput.payments && Array.isArray(paymentsInput.payments)) {
      payments = paymentsInput.payments;
    } else if (paymentsInput.amount !== undefined && paymentsInput.method) {
      // Legacy single payment format
      payments = [
        {
          amount: paymentsInput.amount,
          method: paymentsInput.method,
          currencyCode: paymentsInput.currencyCode,
          exchangeRate: paymentsInput.exchangeRate,
        },
      ];
    } else {
      throw new BadRequestException('No payments provided');
    }

    // Validate all payments
    if (payments.length === 0) {
      throw new BadRequestException('At least one payment is required');
    }

    if (payments.some((p) => p.amount <= 0)) {
      throw new BadRequestException(
        'All payment amounts must be greater than 0',
      );
    }

    // ── Shift context (passed by caller; no auto-resolution) ─────────────
    const resolvedShiftId = paymentsInput.shiftId || null;
    const resolvedDeviceId = paymentsInput.deviceId || null;

    // Validate shift/device ownership against the order branch
    if (resolvedShiftId || resolvedDeviceId) {
      const orderForBranch = await this.prisma.order.findFirst({
        where: { id: orderId, tenantId },
        select: { branchId: true },
      });
      if (!orderForBranch) throw new NotFoundException('Order not found');
      await this.validateShiftAndDevice({
        tenantId,
        branchId: orderForBranch.branchId,
        shiftId: resolvedShiftId,
        deviceId: resolvedDeviceId,
      });
    }

    if (resolvedShiftId) {
      const shift = await this.prisma.shift.findFirst({
        where: { id: resolvedShiftId, tenantId },
        select: { status: true },
      });
      if (!shift) throw new NotFoundException('Shift not found');
      if (shift.status !== ShiftStatus.OPEN) {
        throw new BadRequestException(
          'Cannot process payment on a closed shift',
        );
      }
    }

    // ── Idempotency check (order-scoped) ─────────────────────────────────
    if (paymentsInput.idempotencyKey) {
      const existing = await this.prisma.payment.findFirst({
        where: {
          orderId,
          idempotencyKey: paymentsInput.idempotencyKey,
          order: { tenantId },
        },
      });
      if (existing) {
        return this.buildIdempotentPaymentResponse(tenantId, orderId);
      }
    }

    // ── Phase 1: Atomic payment + status update ──────────────────────────
    // Run payment records + order status inside ONE transaction.
    // Inventory deduction is intentionally OUTSIDE to avoid deadlocks:
    // deductStockForOrder uses its own PrismaService connection and opens
    // its own $transaction — if called inside this tx it deadlocks because
    // the Serializable lock on Order blocks the outside read.

    try {
      const txResult = await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, tenantId },
          select: {
            id: true,
            status: true,
            total: true, // ✅ already includes VAT + shipping
            subtotal: true,
            discount: true,
            branchId: true,
            shiftId: true,
            deviceId: true,
            tableId: true,
            currencyCode: true,
            customerId: true,
            loyaltyRedeemedPoints: true,
            loyaltyRedeemedAmount: true,
            payments: {
              select: { amount: true }, // amount is in BASE currency
            },
            tenant: {
              select: { businessType: true },
            },
          },
        });

        if (!order) throw new NotFoundException('Order not found');

        if (order.status === OrderStatus.CANCELLED) {
          throw new BadRequestException('Cannot pay a cancelled order');
        }

        // Re-check shift state inside transaction to prevent writes after concurrent close.
        if (resolvedShiftId) {
          const shift = await tx.shift.findFirst({
            where: { id: resolvedShiftId, tenantId },
            select: { status: true },
          });
          if (!shift) throw new NotFoundException('Shift not found');
          if (shift.status !== ShiftStatus.OPEN) {
            throw new BadRequestException(
              'Cannot process payment on a closed shift',
            );
          }
        }

        /* ============================================
         LOYALTY REDEMPTION
       ============================================ */

        let loyaltyRedeemedAmount = Number(order.loyaltyRedeemedAmount || 0);
        let loyaltyRedeemedPoints = order.loyaltyRedeemedPoints || 0;
        let _loyaltyApplied = false;

        const loyaltyRequest = paymentsInput.loyalty?.redeemPoints;
        if (loyaltyRequest && loyaltyRequest > 0) {
          if (loyaltyRedeemedPoints > 0) {
            throw new BadRequestException(
              'Loyalty points already redeemed on this order',
            );
          }
          if (!order.customerId) {
            throw new BadRequestException(
              'Customer is required for loyalty redemption',
            );
          }

          const program = await this.loyaltyService.getProgram(tenantId);
          if (!program.isEnabled) {
            throw new BadRequestException('Loyalty program is not enabled');
          }
          if (
            !program.redeemPointsStep ||
            !program.redeemCurrencyPerStep ||
            program.maxRedeemPercent == null
          ) {
            throw new BadRequestException(
              'Loyalty program redemption not configured',
            );
          }
          if (loyaltyRequest < (program.minRedeemPoints || 0)) {
            throw new BadRequestException(
              `Minimum redemption is ${program.minRedeemPoints} points`,
            );
          }

          const account = await this.loyaltyService.getAccount(
            tenantId,
            order.customerId,
          );
          if (account.pointsBalance < loyaltyRequest) {
            throw new BadRequestException(
              `Insufficient loyalty balance. Available: ${account.pointsBalance}`,
            );
          }

          const eligibleBase = LoyaltyMath.computeEligibleBase(
            order.subtotal,
            order.discount || 0,
            0,
          );

          const redemption = LoyaltyMath.computeRedemption({
            requestedPoints: loyaltyRequest,
            redeemPointsStep: program.redeemPointsStep,
            redeemCurrencyPerStep: program.redeemCurrencyPerStep,
            maxRedeemPercent: program.maxRedeemPercent,
            eligibleBase,
          });

          if (redemption.appliedPoints === 0) {
            throw new BadRequestException(
              'No points can be redeemed for this order',
            );
          }

          await tx.order.update({
            where: { id: orderId },
            data: {
              loyaltyRedeemedPoints: redemption.appliedPoints,
              loyaltyRedeemedAmount: redemption.appliedDiscount,
              loyaltyRedeemBaseAtCompletion: eligibleBase,
            },
          });

          loyaltyRedeemedAmount = Number(redemption.appliedDiscount);
          loyaltyRedeemedPoints = redemption.appliedPoints;
          _loyaltyApplied = true;
        }

        /* ============================================
         BATCH CALCULATION IN BASE CURRENCY
      ============================================ */

        const totalDue = this.money(
          Number(order.total) - loyaltyRedeemedAmount,
        );

        // Already paid (all in base currency)
        const alreadyPaid = this.money(
          order.payments.reduce((sum, p) => sum + Number(p.amount), 0),
        );

        // Convert all payments to base currency and sum them
        const batchTotalBase = this.money(
          payments.reduce((sum, payment) => {
            const exchangeRate =
              payment.currencyCode &&
              payment.currencyCode !== order.currencyCode
                ? payment.exchangeRate || 1
                : 1;

            if (!exchangeRate || exchangeRate <= 0) {
              throw new BadRequestException('Invalid exchange rate');
            }

            const paymentInBase = payment.amount * exchangeRate;
            return sum + paymentInBase;
          }, 0),
        );

        // New total paid (in base currency)
        const newTotalPaid = this.money(alreadyPaid + batchTotalBase);

        // Check if any card payment exceeds remaining (card cannot overpay)
        const remaining = this.money(Math.max(0, totalDue - alreadyPaid));
        const hasCardPayment = payments.some(
          (p) => p.method !== PaymentMethod.CASH,
        );

        if (hasCardPayment && batchTotalBase > remaining) {
          throw new BadRequestException(
            `Payment exceeds remaining balance. Remaining: ${remaining}`,
          );
        }

        const isFullyPaid = newTotalPaid >= totalDue;

        /* ============================================
         CREATE PAYMENT RECORDS FOR ALL PAYMENTS
      ============================================ */

        const createdPayments = await Promise.all(
          payments.map((payment, idx) => {
            const exchangeRate =
              payment.currencyCode &&
              payment.currencyCode !== order.currencyCode
                ? payment.exchangeRate || 1
                : 1;

            const paymentInBase = this.money(payment.amount * exchangeRate);

            // Build idempotency key: first payment gets the main key, subsequent get suffixed
            const paymentIdempotencyKey = paymentsInput.idempotencyKey
              ? idx === 0
                ? paymentsInput.idempotencyKey
                : `${paymentsInput.idempotencyKey}__${idx}`
              : undefined;

            return tx.payment.create({
              data: {
                orderId,
                method: payment.method,
                amount: new Prisma.Decimal(paymentInBase), // Store BASE currency
                currencyCode: payment.currencyCode,
                exchangeRate: exchangeRate
                  ? new Prisma.Decimal(exchangeRate)
                  : undefined,
                // ── Shift attribution ──
                shiftId: resolvedShiftId || undefined,
                deviceId: resolvedDeviceId || undefined, // nullable FK-safe (B)
                userId,
                idempotencyKey: paymentIdempotencyKey,
              },
            });
          }),
        );

        /* ============================================
         CREATE CASH MOVEMENTS (for cash payments)
      ============================================ */

        if (resolvedShiftId && order.branchId) {
          const cashPayments = createdPayments.filter(
            (p) => p.method === PaymentMethod.CASH,
          );

          if (cashPayments.length > 0) {
            await Promise.all(
              cashPayments.map((cp) =>
                tx.cashMovement.create({
                  data: {
                    tenantId,
                    branchId: order.branchId,
                    shiftId: resolvedShiftId,
                    deviceId: resolvedDeviceId || undefined,
                    userId,
                    type: CashMovementType.CASH_SALE,
                    amount: new Prisma.Decimal(Number(cp.amount)),
                    reason: `Payment for order ${orderId}`,
                    referenceId: cp.id,
                    referenceType: CashMovementReferenceType.PAYMENT,
                  },
                }),
              ),
            );
          }
        }

        /* ============================================
         BACKFILL Order.shiftId (if null and shift provided)
      ============================================ */
        if (resolvedShiftId && !order.shiftId) {
          await tx.order.update({
            where: { id: orderId },
            data: {
              shiftId: resolvedShiftId,
              ...(resolvedDeviceId &&
                !order.deviceId && { deviceId: resolvedDeviceId }),
            },
          });
        }

        /* ============================================
         UPDATE ORDER STATUS
      ============================================ */

        const isRestaurant =
          order.tenant?.businessType === BusinessType.RESTAURANT;

        // Payment writes the PAYMENT axis. The only fulfillment move a
        // payment may trigger is closing/committing a RETAIL sale —
        // restaurant orders complete explicitly (cashier close), never here.
        let shouldDeductInventory = false;
        let newStatus: OrderStatus | null = null;
        const newPaymentStatus = this.derivePaymentStatus(
          newTotalPaid,
          totalDue,
        );

        if (!isRestaurant && isFullyPaid) {
          // Retail instant sale: full payment closes the order.
          const orderWithTable = await tx.order.findFirst({
            where: { id: orderId },
            select: { tableId: true },
          });

          newStatus = OrderStatus.COMPLETED;

          await tx.order.update({
            where: { id: orderId },
            data: {
              status: newStatus,
              paymentStatus: newPaymentStatus,
              completedAt: new Date(),
            },
          });
          await this.recordTransition(
            tx,
            orderId,
            order.status,
            newStatus,
            userId,
          );

          if (orderWithTable?.tableId) {
            await this.tableStatusService.markTableAvailableIfPossible(
              orderWithTable.tableId,
              orderId,
              tenantId,
              tx,
            );
          }

          // Flag for post-commit inventory deduction (retail only —
          // restaurant deducts when the order is COMPLETED via updateStatus)
          shouldDeductInventory = true;
        } else if (
          !isRestaurant &&
          !isFullyPaid &&
          order.status === OrderStatus.DRAFT
        ) {
          // Retail credit sale: partial payment commits the draft.
          newStatus = OrderStatus.PLACED;
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: newStatus,
              paymentStatus: newPaymentStatus,
              placedAt: new Date(),
            },
          });
          await this.recordTransition(
            tx,
            orderId,
            order.status,
            newStatus,
            userId,
          );
        } else {
          await tx.order.update({
            where: { id: orderId },
            data: { paymentStatus: newPaymentStatus },
          });
        }

        /* ============================================
         CALCULATE CHANGE (CASH ONLY)
      ============================================ */

        const changeBase = Math.max(0, newTotalPaid - totalDue);

        // For cash payments, return change in the first cash payment's currency
        const firstCashPayment = payments.find(
          (p) => p.method === PaymentMethod.CASH,
        );

        const changeInfo = firstCashPayment
          ? {
              amount: this.money(
                changeBase / (firstCashPayment.exchangeRate || 1),
              ),
              currency: firstCashPayment.currencyCode || order.currencyCode,
            }
          : {
              amount: this.money(0),
              currency: order.currencyCode,
            };

        /* ============================================
         CASH CHANGE MOVEMENT
      ============================================ */

        if (
          resolvedShiftId &&
          order.branchId &&
          changeBase > 0 &&
          firstCashPayment
        ) {
          await tx.cashMovement.create({
            data: {
              tenantId,
              branchId: order.branchId,
              shiftId: resolvedShiftId,
              deviceId: resolvedDeviceId || undefined,
              userId,
              type: CashMovementType.CASH_CHANGE,
              amount: new Prisma.Decimal(changeBase),
              reason: `Change for order ${orderId}`,
              referenceId: orderId,
              referenceType: CashMovementReferenceType.ORDER,
            },
          });
        }

        const finalStatus = newStatus ?? order.status;

        return {
          orderId,
          status: finalStatus,
          paymentStatus: newPaymentStatus,
          totalDue,
          paid: this.money(Math.min(newTotalPaid, totalDue)),
          remaining: this.money(Math.max(0, totalDue - newTotalPaid)),
          change: changeInfo,
          paymentCount: payments.length,
          loyaltyRedeemedPoints,
          loyaltyRedeemedAmount,
          // Internal flags — stripped before returning to client
          _shouldDeductInventory: shouldDeductInventory,
          _branchId: order.branchId,
          _tableId: order.tableId,
          _loyaltyApplied,
          _customerId: order.customerId,
        };
      });

      // Post-commit: a payment changes the table's floor-plan state
      // (BILLING badge, paid amount). Never emitted inside the tx.
      if (txResult._tableId) {
        this.eventEmitter.emit('table.updated', {
          branchId: txResult._branchId,
        });
      }

      // ── Phase 2: Post-commit inventory deduction ─────────────────────────
      // Runs AFTER the transaction commits, on its own connection.
      // If this fails, payment is still recorded — inventory can be reconciled.
      if (txResult._shouldDeductInventory) {
        try {
          await this.inventoryDeductionService.deductStockForOrder(
            tenantId,
            orderId,
            txResult._branchId,
            userId,
          );
        } catch (err) {
          // Log but don't fail the payment — order + payment are committed.
          // Inventory can be reconciled separately.
          console.error(
            `[processPayment] Inventory deduction failed for order ${orderId}:`,
            err,
          );
        }
      }

      // ── Phase 3: Post-commit loyalty ledger debit ────────────────────────
      if (txResult._loyaltyApplied && txResult._customerId) {
        try {
          await this.loyaltyService.applyLedgerEntry({
            tenantId,
            customerId: txResult._customerId,
            orderId,
            type: LoyaltyTransactionType.REDEEM,
            direction: LoyaltyDirection.DEBIT,
            points: txResult.loyaltyRedeemedPoints,
            moneyAmount: txResult.loyaltyRedeemedAmount,
            idempotencyKey: `order:${orderId}:redeem`,
            actorUserId: userId,
          });
        } catch (err) {
          this.logger.error(
            `[processPayment] Loyalty debit failed for order ${orderId}:`,
            err,
          );
        }
      }

      // ── Phase 4: Post-commit loyalty earn (retail → COMPLETED) ───────────
      if (txResult.status === OrderStatus.COMPLETED && txResult._customerId) {
        await this.earnLoyaltyPoints(tenantId, orderId, userId);
      }

      // Strip internal flags before returning
      const { ...result } = txResult;
      return result;
    } catch (error) {
      if (
        paymentsInput.idempotencyKey &&
        this.isIdempotencyUniqueError(error)
      ) {
        const candidateKeys = payments.map((_, idx) =>
          idx === 0
            ? paymentsInput.idempotencyKey!
            : `${paymentsInput.idempotencyKey}__${idx}`,
        );
        const existing = await this.prisma.payment.findFirst({
          where: {
            orderId,
            idempotencyKey: { in: candidateKeys },
            order: { tenantId },
          },
          select: { id: true },
        });
        if (existing) {
          return this.buildIdempotentPaymentResponse(tenantId, orderId);
        }
      }
      throw error;
    }
  }

  async processPayment_LEGACY(
    tenantId: string,
    orderId: string,
    payment: PaymentDto,
    userId: string,
  ) {
    if (payment.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Phase 1: Atomic payment + status update
    const txResult = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        select: {
          id: true,
          status: true,
          total: true, // ✅ already includes VAT + shipping
          branchId: true,
          currencyCode: true,
          tenant: {
            select: { businessType: true },
          },
          payments: {
            select: { amount: true }, // amount is BASE currency
          },
        },
      });

      if (!order) throw new NotFoundException('Order not found');

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot pay a cancelled order');
      }

      /* --------------------------------------------
       BASE CURRENCY CALCULATIONS ONLY
    -------------------------------------------- */

      const totalDue = this.money(Number(order.total));

      const alreadyPaid = this.money(
        order.payments.reduce((sum, p) => sum + Number(p.amount), 0),
      );

      const remaining = this.money(Math.max(0, totalDue - alreadyPaid));

      /* --------------------------------------------
       Convert incoming payment to BASE currency
    -------------------------------------------- */

      const exchangeRate =
        payment.currencyCode && payment.currencyCode !== order.currencyCode
          ? payment.exchangeRate
          : 1;

      if (!exchangeRate || exchangeRate <= 0) {
        throw new BadRequestException('Invalid exchange rate');
      }

      const paymentBase = this.money(payment.amount * exchangeRate);

      /* --------------------------------------------
       CARD RULE: cannot exceed remaining
    -------------------------------------------- */

      if (payment.method !== PaymentMethod.CASH && paymentBase > remaining) {
        throw new BadRequestException(
          `Payment exceeds remaining balance. Remaining: ${remaining}`,
        );
      }

      /* --------------------------------------------
       Create payment record (BASE currency stored)
    -------------------------------------------- */

      await tx.payment.create({
        data: {
          orderId,
          method: payment.method,
          amount: paymentBase, // ✅ BASE currency
          currencyCode: payment.currencyCode,
          exchangeRate: payment.exchangeRate,
        },
      });

      const newPaidBase = this.money(alreadyPaid + paymentBase);

      const isFullyPaid = newPaidBase >= totalDue;

      /* --------------------------------------------
        Order state
     -------------------------------------------- */

      let shouldDeductInventory = false;
      let legacyNewStatus: OrderStatus | null = null;
      const legacyPaymentStatus = this.derivePaymentStatus(
        newPaidBase,
        totalDue,
      );
      const isRestaurantTenant =
        order.tenant?.businessType === BusinessType.RESTAURANT;

      if (isFullyPaid && !isRestaurantTenant) {
        // Retail instant sale: full payment closes the order.
        const orderWithTable = await tx.order.findFirst({
          where: { id: orderId },
          select: { tableId: true },
        });

        legacyNewStatus = OrderStatus.COMPLETED;
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: legacyNewStatus,
            paymentStatus: legacyPaymentStatus,
            completedAt: new Date(),
          },
        });
        await this.recordTransition(
          tx,
          orderId,
          order.status,
          legacyNewStatus,
          userId,
        );

        if (orderWithTable?.tableId) {
          await this.tableStatusService.markTableAvailableIfPossible(
            orderWithTable.tableId,
            orderId,
            tenantId,
            tx,
          );
        }

        shouldDeductInventory = true;
      } else if (
        !isRestaurantTenant &&
        !isFullyPaid &&
        order.status === OrderStatus.DRAFT
      ) {
        // Retail credit sale: partial payment commits the draft.
        legacyNewStatus = OrderStatus.PLACED;
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: legacyNewStatus,
            paymentStatus: legacyPaymentStatus,
            placedAt: new Date(),
          },
        });
        await this.recordTransition(
          tx,
          orderId,
          order.status,
          legacyNewStatus,
          userId,
        );
      } else {
        // Restaurant: payment never moves the fulfillment axis.
        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: legacyPaymentStatus },
        });
      }

      /* --------------------------------------------
       CASH CHANGE (returned in ORIGINAL currency)
    -------------------------------------------- */

      const changeBase = Math.max(0, newPaidBase - totalDue);

      const changeOriginal =
        payment.method === PaymentMethod.CASH
          ? this.money(changeBase / exchangeRate)
          : 0;

      return {
        orderId,
        status: legacyNewStatus ?? order.status,
        paymentStatus: legacyPaymentStatus,
        totalDue,
        paid: this.money(Math.min(newPaidBase, totalDue)),
        remaining: this.money(Math.max(0, totalDue - newPaidBase)),

        change: {
          amount: changeOriginal,
          currency: payment.currencyCode ?? order.currencyCode,
        },

        _shouldDeductInventory: shouldDeductInventory,
        _branchId: order.branchId,
      };
    });

    // Phase 2: Post-commit inventory deduction
    if (txResult._shouldDeductInventory) {
      try {
        await this.inventoryDeductionService.deductStockForOrder(
          tenantId,
          orderId,
          txResult._branchId,
          userId,
        );
      } catch (err) {
        console.error(
          `[processPayment_LEGACY] Inventory deduction failed for order ${orderId}:`,
          err,
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _shouldDeductInventory, _branchId, ...result } = txResult;
    return result;
  }

  /* ----------------------------------------------------
     DRAFT MODIFICATIONS
  ---------------------------------------------------- */

  async addItemToOrder(
    tenantId: string,
    orderId: string,
    dto: AddItemDto,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const order = await db.order.findFirst({
      where: { id: orderId, tenantId },
      select: {
        status: true,
        tenant: { select: { businessType: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const isRestaurant = order.tenant.businessType === BusinessType.RESTAURANT;
    if (isRestaurant) {
      if (!EDITABLE_ORDER_STATUSES.includes(order.status)) {
        throw new BadRequestException(
          `Cannot add items to order with status ${order.status}`,
        );
      }
    } else if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        'Retail orders can only be modified in DRAFT status',
      );
    }

    const product = await db.product.findFirst({
      where: { id: dto.productId, tenantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const unitPrice =
      typeof dto.unitPrice === 'number' ? dto.unitPrice : Number(product.price);
    let modifiersTotal = 0;
    const itemModifiers: { modifierId: string; price: number }[] = [];

    if (dto.modifiers?.length) {
      const modifiers = await db.modifier.findMany({
        where: {
          id: { in: dto.modifiers },
          tenantId,
          deletedAt: null,
        },
        select: { id: true, price: true },
      });
      const modifierMap = new Map(modifiers.map((m) => [m.id, m]));

      for (const modifierId of dto.modifiers) {
        const modifier = modifierMap.get(modifierId);
        if (modifier) {
          const modifierPrice = Number(modifier.price);
          modifiersTotal += modifierPrice;
          itemModifiers.push({
            modifierId,
            price: modifierPrice,
          });
        }
      }
    }

    let lineSubtotal = dto.quantity * (unitPrice + modifiersTotal);

    // Apply item-level discount if present
    if (dto.discount) {
      const { value, type } = dto.discount;
      const discountAmount =
        type === 'PERCENTAGE'
          ? (lineSubtotal * Number(value)) / 100
          : Number(value);
      lineSubtotal -= discountAmount;
    }

    const subtotal = lineSubtotal;

    await db.orderItem.create({
      data: {
        orderId,
        productId: product.id,
        quantity: dto.quantity,
        unitPrice: new Prisma.Decimal(unitPrice),
        subtotal: new Prisma.Decimal(subtotal),
        total: new Prisma.Decimal(subtotal),
        notes: dto.notes,
        discount: dto.discount,
        ...(itemModifiers.length > 0 && {
          modifiers: {
            create: itemModifiers.map((m) => ({
              modifier: { connect: { id: m.modifierId } },
              price: new Prisma.Decimal(m.price),
            })),
          },
        }),
      },
    });

    return this.recalculateOrderTotals(tenantId, orderId, tx);
  }

  async updateItemQuantity(
    tenantId: string,
    orderId: string,
    itemId: string,
    quantity: number,
  ) {
    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { quantity },
    });
    return this.recalculateOrderTotals(tenantId, orderId);
  }

  async removeItemFromOrder(tenantId: string, orderId: string, itemId: string) {
    await this.prisma.orderItem.delete({ where: { id: itemId } });
    return this.recalculateOrderTotals(tenantId, orderId);
  }

  async updateItemDiscount(
    tenantId: string,
    orderId: string,
    itemId: string,
    value: number,
    type: 'PERCENTAGE' | 'FIXED',
  ) {
    // Validate order exists and belongs to tenant
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Update item discount
    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        discount: {
          value,
          type,
        },
      },
    });

    return this.recalculateOrderTotals(tenantId, orderId);
  }

  async updateDiscount(tenantId: string, orderId: string, discount: number) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { discount },
    });
    return this.recalculateOrderTotals(tenantId, orderId);
  }

  /* ----------------------------------------------------
     INVENTORY / KITCHEN
  ---------------------------------------------------- */

  async previewOrderStockDeductions(
    tenantId: string,
    branchId: string,
    orderId: string,
  ) {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      select: { productId: true, quantity: true },
    });

    return this.inventoryDeductionService.previewStockDeductions(
      tenantId,
      branchId,
      items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    );
  }

  async sendToKitchen(tenantId: string, orderId: string): Promise<unknown> {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        select: {
          id: true,
          status: true,
          branchId: true,
          tenant: { select: { businessType: true } },
          items: {
            select: {
              id: true,
              tickets: {
                select: { id: true, station: true },
              },
            },
          },
        },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.tenant.businessType !== BusinessType.RESTAURANT) {
        throw new BadRequestException(
          'Send to kitchen is only available for restaurant orders',
        );
      }

      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.COMPLETED
      ) {
        throw new BadRequestException(
          'Cannot send a completed or cancelled order to kitchen',
        );
      }

      // Only send items that do NOT already have a ticket for the default station
      const itemsToSend = order.items.filter(
        (item) => !item.tickets.some((t) => t.station === null),
      );

      if (itemsToSend.length === 0) {
        return order;
      }

      const sentAt = new Date();
      await tx.orderItemTicket.createMany({
        data: itemsToSend.map((item) => ({
          orderItemId: item.id,
          station: null,
          status: TicketStatus.QUEUED,
          sentAt,
        })),
      });

      // First fire commits the draft: DRAFT → PLACED
      let updatedOrder: unknown;

      if (order.status === OrderStatus.DRAFT) {
        updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PLACED, placedAt: sentAt },
        });
        await this.recordTransition(
          tx,
          orderId,
          order.status,
          OrderStatus.PLACED,
        );
      } else {
        updatedOrder = order;
      }

      // Emit event for real-time kitchen updates
      this.eventEmitter.emit('kitchen.order.created', {
        branchId: order.branchId,
        orderId: order.id,
      });

      return updatedOrder;
    });
  }

  async batchAddItemsToOrder(
    tenantId: string,
    orderId: string,
    items: AddItemDto[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
      });

      if (!order) throw new NotFoundException('Order not found');

      // Allow batch additions in any editable status
      if (!EDITABLE_ORDER_STATUSES.includes(order.status)) {
        throw new BadRequestException(
          `Cannot add items to order with status ${order.status}`,
        );
      }

      for (const itemDto of items) {
        await this.addItemToOrder(tenantId, orderId, itemDto, tx);
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      });
    });
  }

  async assignTableToOrder(tenantId: string, orderId: string, tableId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        select: { status: true, type: true, tableId: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      const oldTableId = order.tableId;

      // Verify new table exists
      const table = await tx.table.findFirst({
        where: { id: tableId, tenantId, deletedAt: null },
      });
      if (!table) throw new NotFoundException('Table not found');

      // Guard: block assign if table already has active orders (one-order-per-table)
      if (tableId !== oldTableId) {
        const activeOrders = await this.getActiveOrdersOnTable(
          tableId,
          tenantId,
          tx,
        );
        if (activeOrders.length > 0) {
          throw new ConflictException({
            code: 'TABLE_HAS_ACTIVE_ORDER',
            tableId,
            activeOrderIds: activeOrders.map((o) => o.id),
            message:
              'This table already has an active order. Transfer and merge instead.',
          });
        }
      }

      // Update the order with the new table
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { tableId },
        include: {
          table: true,
          items: { include: { product: true } },
        },
      });

      // Mark new table as occupied
      await this.tableStatusService.markTableOccupiedIfNeeded(
        tableId,
        tenantId,
        tx,
      );

      // Release old table if it was different and has no remaining active orders
      if (oldTableId && oldTableId !== tableId) {
        await this.tableStatusService.markTableAvailableIfPossible(
          oldTableId,
          orderId,
          tenantId,
          tx,
        );
      }

      return updated;
    });

    // Post-commit: both source and target tables changed on the floor plan.
    if (result.table) {
      this.eventEmitter.emit('table.updated', {
        branchId: result.table.branchId,
      });
    }

    return result;
  }

  /**
   * Transfer an order from its current table to a different table.
   * If the target table has active orders and mergeIntoOrderId is provided,
   * atomically: transfer + merge in one transaction.
   * If the target has active orders and no mergeIntoOrderId, throw ConflictException.
   */
  async transferOrderToTable(
    tenantId: string,
    orderId: string,
    targetTableId: string,
    mergeIntoOrderId?: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        select: { id: true, status: true, tableId: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      if (!order.tableId) {
        throw new BadRequestException(
          'Order is not assigned to any table. Use assign-table instead.',
        );
      }

      if (order.tableId === targetTableId) {
        throw new BadRequestException('Order is already on this table');
      }

      // Verify target table exists
      await this.tableStatusService.validateTableForOrder(
        targetTableId,
        tenantId,
        tx,
      );

      // Check if target table has active orders
      const targetActiveOrders = await this.getActiveOrdersOnTable(
        targetTableId,
        tenantId,
        tx,
      );
      const targetActiveOrderIds = targetActiveOrders.map((o) => o.id);

      if (targetActiveOrders.length > 0 && !mergeIntoOrderId) {
        throw new ConflictException({
          code: 'TABLE_HAS_ACTIVE_ORDER',
          tableId: targetTableId,
          activeOrderIds: targetActiveOrderIds,
          message:
            'Target table has active orders. Provide mergeIntoOrderId to merge.',
        });
      }
      if (targetActiveOrders.length === 0 && mergeIntoOrderId) {
        throw new BadRequestException(
          'mergeIntoOrderId was provided but target table has no active orders',
        );
      }
      if (
        targetActiveOrders.length > 0 &&
        mergeIntoOrderId &&
        !targetActiveOrderIds.includes(mergeIntoOrderId)
      ) {
        throw new BadRequestException(
          'mergeIntoOrderId is not an active order on the target table',
        );
      }

      const sourceTableId = order.tableId;

      // Move the order to target table
      await tx.order.update({
        where: { id: orderId },
        data: { tableId: targetTableId },
      });

      // Mark target table as occupied
      await this.tableStatusService.markTableOccupiedIfNeeded(
        targetTableId,
        tenantId,
        tx,
      );

      // If mergeIntoOrderId provided, merge within the same transaction
      if (mergeIntoOrderId) {
        const merged = await this.mergeOrdersInTx(
          tx,
          tenantId,
          mergeIntoOrderId,
          orderId,
        );

        await this.tableStatusService.markTableAvailableIfPossible(
          sourceTableId,
          orderId,
          tenantId,
          tx,
        );

        return merged;
      }

      // Release source table if no more active orders
      await this.tableStatusService.markTableAvailableIfPossible(
        sourceTableId,
        orderId,
        tenantId,
        tx,
      );

      // Return the transferred order
      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          table: true,
          items: {
            include: {
              product: true,
              modifiers: { include: { modifier: true } },
            },
          },
          payments: true,
          customer: true,
        },
      });
    });

    // Post-commit: source and target tables both changed on the floor plan.
    const targetTable = await this.prisma.table.findFirst({
      where: { id: targetTableId, tenantId },
      select: { branchId: true },
    });
    if (targetTable) {
      this.eventEmitter.emit('table.updated', {
        branchId: targetTable.branchId,
      });
    }

    return result;
  }

  async mergeOrders(
    tenantId: string,
    targetOrderId: string,
    sourceOrderId: string,
  ) {
    if (targetOrderId === sourceOrderId) {
      throw new BadRequestException('Cannot merge an order with itself');
    }

    const MERGEABLE_STATUSES = new Set<string>(ACTIVE_ORDER_STATUSES);

    const merged = await this.prisma.$transaction(async (tx) => {
      const [target, source] = await Promise.all([
        tx.order.findFirst({
          where: { id: targetOrderId, tenantId },
          select: {
            id: true,
            status: true,
            tableId: true,
            branchId: true,
            tenant: { select: { businessType: true } },
          },
        }),
        tx.order.findFirst({
          where: { id: sourceOrderId, tenantId },
          include: {
            items: {
              include: {
                modifiers: true,
                tickets: true,
              },
            },
            payments: true,
          },
        }),
      ]);

      if (!target) throw new NotFoundException('Target order not found');
      if (!source) throw new NotFoundException('Source order not found');

      if (target.tenant.businessType !== BusinessType.RESTAURANT) {
        throw new BadRequestException(
          'Order merging is only available for restaurant orders',
        );
      }

      if (!MERGEABLE_STATUSES.has(target.status)) {
        throw new BadRequestException(
          `Target order status "${target.status}" does not allow merging`,
        );
      }

      if (!MERGEABLE_STATUSES.has(source.status)) {
        throw new BadRequestException(
          `Source order status "${source.status}" does not allow merging`,
        );
      }

      if (!target.tableId || !source.tableId) {
        throw new BadRequestException(
          'Both orders must be assigned to a table to merge',
        );
      }

      if (target.tableId !== source.tableId) {
        throw new BadRequestException(
          'Both orders must be on the same table to merge',
        );
      }

      // Move all items from source to target
      await tx.orderItem.updateMany({
        where: { orderId: sourceOrderId },
        data: { orderId: targetOrderId },
      });

      // Move any payments from source to target
      if (source.payments.length > 0) {
        await tx.payment.updateMany({
          where: { orderId: sourceOrderId },
          data: { orderId: targetOrderId },
        });
      }

      // Cancel the source order (now empty)
      await tx.order.update({
        where: { id: sourceOrderId },
        data: { status: OrderStatus.CANCELLED },
      });
      await this.recordTransition(
        tx,
        sourceOrderId,
        source.status,
        OrderStatus.CANCELLED,
      );

      // Recalculate target order totals
      // (inline to use tx)
      const allItems = await tx.orderItem.findMany({
        where: { orderId: targetOrderId },
        select: { subtotal: true },
      });

      const subtotal = this.round(
        allItems.reduce((s, i) => s + Number(i.subtotal), 0),
      );

      const targetFull = await tx.order.findUnique({
        where: { id: targetOrderId },
        select: {
          discount: true,
          shippingFee: true,
          includeVAT: true,
          payments: { select: { amount: true } },
        },
      });

      const discount = Number(targetFull?.discount || 0);
      const shippingFee = Number(targetFull?.shippingFee || 0);
      const includeVAT = Boolean(targetFull?.includeVAT);
      const afterDiscount = this.round(
        Math.max(0, subtotal - discount + shippingFee),
      );
      const vat = includeVAT ? this.round(afterDiscount * VAT_RATE) : 0;
      const total = this.round(afterDiscount + vat);

      // Re-evaluate paid status
      const paid = this.money(
        (targetFull?.payments || []).reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        ),
      );
      await tx.order.update({
        where: { id: targetOrderId },
        data: {
          subtotal,
          total,
          vat,
          paymentStatus: this.derivePaymentStatus(paid, total),
        },
      });

      // Return the merged target order
      return tx.order.findUnique({
        where: { id: targetOrderId },
        include: {
          items: {
            include: {
              product: true,
              modifiers: { include: { modifier: true } },
            },
          },
          payments: true,
          customer: true,
          table: true,
        },
      });
    });

    // Post-commit: merged table's bill/status changed on the floor plan.
    if (merged?.table) {
      this.eventEmitter.emit('table.updated', {
        branchId: merged.table.branchId,
      });
    }

    return merged;
  }

  private async findIdempotentSplitOrder(
    tenantId: string,
    orderId: string,
    idempotencyKey: string,
    include: Prisma.OrderInclude,
  ) {
    const newOrder = await this.prisma.order.findFirst({
      where: { tenantId, idempotencyKey },
      include,
    });
    if (!newOrder) return null;

    const originalOrder = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include,
    });
    return { originalOrder, newOrder };
  }

  async splitOrder(
    tenantId: string,
    userId: string,
    orderId: string,
    splits: SplitOrderItemDto[],
    idempotencyKey?: string,
  ) {
    const fullInclude = {
      items: {
        include: {
          product: true,
          modifiers: { include: { modifier: true } },
        },
      },
      payments: true,
      customer: true,
      table: true,
    } satisfies Prisma.OrderInclude;

    // ── Idempotency check (tenant-scoped) ─────────────────────────────────
    if (idempotencyKey) {
      const existing = await this.findIdempotentSplitOrder(
        tenantId,
        orderId,
        idempotencyKey,
        fullInclude,
      );
      if (existing) return existing;
    }

    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.prisma.$transaction(
          async (tx) => {
            const source = await tx.order.findFirst({
              where: { id: orderId, tenantId },
              include: {
                items: { include: { modifiers: true, tickets: true } },
                payments: true,
              },
            });
            if (!source) throw new NotFoundException('Order not found');

            const activeStatuses: OrderStatus[] = this.ACTIVE_ORDER_STATUSES;
            if (!activeStatuses.includes(source.status as OrderStatus)) {
              throw new BadRequestException({
                message: `Order status "${source.status}" does not allow splitting`,
                code: 'ORDER_NOT_SPLITTABLE',
              });
            }

            // Payment allocation during split is not implemented; reject if
            // any payment has been made to the order yet.
            if (source.payments && source.payments.length > 0) {
              throw new BadRequestException({
                message: 'Cannot split an order that has existing payments',
                code: 'SPLIT_ORDER_HAS_PAYMENTS',
              });
            }

            // Collapse duplicate itemIds, then validate against the source items.
            const requestedByItemId = new Map<string, number>();
            for (const { itemId, quantity } of splits) {
              requestedByItemId.set(
                itemId,
                (requestedByItemId.get(itemId) ?? 0) + quantity,
              );
            }

            const moves: {
              item: (typeof source.items)[number];
              quantity: number;
              isFullMove: boolean;
            }[] = [];

            for (const [itemId, quantity] of requestedByItemId) {
              const item = source.items.find((i) => i.id === itemId);
              if (!item) {
                throw new BadRequestException({
                  message: 'Order item not found on this order',
                  code: 'SPLIT_ITEM_NOT_FOUND',
                });
              }
              const available = Number(item.quantity);
              if (quantity > available) {
                throw new BadRequestException({
                  message: `Cannot split ${quantity} of an item with quantity ${available}`,
                  code: 'SPLIT_QUANTITY_EXCEEDS_ITEM',
                });
              }
              moves.push({
                item,
                quantity,
                isFullMove: quantity === available,
              });
            }

            const fullyMovedCount = moves.filter((m) => m.isFullMove).length;
            if (fullyMovedCount === source.items.length) {
              throw new BadRequestException({
                message:
                  'Cannot split the entire order — settle it directly instead',
                code: 'SPLIT_LEAVES_ORDER_EMPTY',
              });
            }

            const branch = await tx.branch.findUnique({
              where: { id: source.branchId },
              select: { name: true },
            });
            if (!branch) throw new NotFoundException('Branch not found');

            const dateStr = formatOrderDate(new Date());
            const sequence = await tx.orderSequence.upsert({
              where: {
                branchId_date: { branchId: source.branchId, date: dateStr },
              },
              update: { lastValue: { increment: 1 } },
              create: {
                tenantId,
                branchId: source.branchId,
                date: dateStr,
                lastValue: 1,
              },
            });
            const orderNumber = `${dateStr}-${getBranchCode(branch.name)}-${sequence.lastValue
              .toString()
              .padStart(4, '0')}`;

            // Split the order-level discount in proportion to the subtotal
            // each side keeps, so a fixed discount doesn't fully land on
            // whichever side happens to retain the source orderId (and
            // doesn't get clamped away in recalculateTotalsInTx if the
            // remaining subtotal shrinks below it).
            const originalItemsSubtotal = this.round(
              source.items.reduce((s, i) => s + Number(i.subtotal), 0),
            );
            const movedSubtotalTotal = this.round(
              moves.reduce((s, m) => {
                const itemSubtotal = Number(m.item.subtotal);
                if (m.isFullMove) return s + itemSubtotal;
                const sourceQty = Number(m.item.quantity);
                return s + (itemSubtotal / sourceQty) * m.quantity;
              }, 0),
            );
            const originalDiscount = Number(source.discount || 0);
            const newOrderDiscount =
              originalItemsSubtotal > 0
                ? this.round(
                    originalDiscount *
                      (movedSubtotalTotal / originalItemsSubtotal),
                  )
                : 0;
            const sourceOrderDiscount = this.round(
              originalDiscount - newOrderDiscount,
            );

            // New order inherits the table/customer context and the source
            // status (items already sent to kitchen stay "sent" — nothing
            // re-fires).
            const newOrder = await tx.order.create({
              data: {
                tenantId,
                branchId: source.branchId,
                userId,
                orderNumber,
                type: source.type,
                status: source.status,
                total: 0,
                subtotal: 0,
                discount: newOrderDiscount,
                shippingFee: 0,
                includeVAT: source.includeVAT,
                vat: 0,
                ...(source.tableId && { tableId: source.tableId }),
                ...(source.customerId && { customerId: source.customerId }),
                ...(source.shiftId && { shiftId: source.shiftId }),
                ...(source.deviceId && { deviceId: source.deviceId }),
                ...(idempotencyKey && { idempotencyKey }),
              },
            });

            for (const { item, quantity, isFullMove } of moves) {
              if (isFullMove) {
                // Reassign the row wholesale — modifiers and tickets follow it.
                await tx.orderItem.update({
                  where: { id: item.id },
                  data: { orderId: newOrder.id },
                });
                continue;
              }

              // Partial move: carve the quantity out. Subtract the moved
              // share from the source line so the two sides always sum to
              // the original. The Serializable isolation level below
              // guarantees this read-then-write is safe against a
              // concurrent split racing on the same source item.
              const sourceQty = Number(item.quantity);
              const movedSubtotal = this.round(
                (Number(item.subtotal) / sourceQty) * quantity,
              );
              const remainingSubtotal = this.round(
                Number(item.subtotal) - movedSubtotal,
              );

              await tx.orderItem.update({
                where: { id: item.id },
                data: {
                  quantity: new Prisma.Decimal(sourceQty - quantity),
                  subtotal: new Prisma.Decimal(remainingSubtotal),
                  total: new Prisma.Decimal(remainingSubtotal),
                },
              });

              await tx.orderItem.create({
                data: {
                  orderId: newOrder.id,
                  productId: item.productId,
                  quantity: new Prisma.Decimal(quantity),
                  unitPrice: item.unitPrice,
                  subtotal: new Prisma.Decimal(movedSubtotal),
                  total: new Prisma.Decimal(movedSubtotal),
                  notes: item.notes,
                  ...(item.discount !== null && {
                    discount: item.discount as Prisma.InputJsonValue,
                  }),
                  ...(item.modifiers.length > 0 && {
                    modifiers: {
                      create: item.modifiers.map((m) => ({
                        modifierId: m.modifierId,
                        price: m.price,
                      })),
                    },
                  }),
                  // Carry the source line's kitchen-ticket state onto the
                  // moved quantity so it isn't re-fired via sendToKitchen
                  // (which only sends items with no ticket) and so the
                  // kitchen display reflects that it's already sent/cooking.
                  ...(item.tickets.length > 0 && {
                    tickets: {
                      create: item.tickets.map((t) => ({
                        station: t.station,
                        status: t.status,
                        sentAt: t.sentAt,
                        bumpedAt: t.bumpedAt,
                      })),
                    },
                  }),
                },
              });
            }

            // The source order keeps whatever discount the split above
            // didn't allocate to the new order.
            await tx.order.update({
              where: { id: source.id },
              data: { discount: sourceOrderDiscount },
            });

            await this.recalculateTotalsInTx(tx, source.id);
            await this.recalculateTotalsInTx(tx, newOrder.id);

            const [originalOrder, splitOrder] = await Promise.all([
              tx.order.findUnique({
                where: { id: source.id },
                include: fullInclude,
              }),
              tx.order.findUnique({
                where: { id: newOrder.id },
                include: fullInclude,
              }),
            ]);

            return {
              originalOrder,
              newOrder: splitOrder,
              branchId: source.branchId,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        // Post-commit: the table's bill breakdown changed on the floor plan.
        this.eventEmitter.emit('table.updated', { branchId: result.branchId });

        return {
          originalOrder: result.originalOrder,
          newOrder: result.newOrder,
        };
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }

        if (idempotencyKey && this.isIdempotencyUniqueError(error)) {
          const existing = await this.findIdempotentSplitOrder(
            tenantId,
            orderId,
            idempotencyKey,
            fullInclude,
          );
          if (existing) return existing;
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

    throw new BadRequestException('Failed to split order after retries');
  }

  private async recalculateTotalsInTx(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { subtotal: true },
    });
    const subtotal = this.round(
      items.reduce((s, i) => s + Number(i.subtotal), 0),
    );

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        discount: true,
        shippingFee: true,
        includeVAT: true,
        payments: { select: { amount: true } },
      },
    });

    const discount = Number(order?.discount || 0);
    const shippingFee = Number(order?.shippingFee || 0);
    const includeVAT = Boolean(order?.includeVAT);
    const afterDiscount = this.round(
      Math.max(0, subtotal - discount + shippingFee),
    );
    const vat = includeVAT ? this.round(afterDiscount * VAT_RATE) : 0;
    const total = this.round(afterDiscount + vat);

    const paid = this.money(
      (order?.payments || []).reduce((sum, p) => sum + Number(p.amount), 0),
    );

    await tx.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        total,
        vat,
        paymentStatus: this.derivePaymentStatus(paid, total),
      },
    });
  }

  // ---- Private helpers for transfer+merge ----

  // Canonical list shared with tables/kitchen via @repo/types.
  private readonly ACTIVE_ORDER_STATUSES = [...ACTIVE_ORDER_STATUSES];

  /**
   * Get active (non-terminal) orders on a table within a transaction.
   */
  private async getActiveOrdersOnTable(
    tableId: string,
    tenantId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.order.findMany({
      where: {
        tableId,
        tenantId,
        status: { in: this.ACTIVE_ORDER_STATUSES },
      },
      select: { id: true, status: true },
    });
  }

  /**
   * Merge logic extracted so it can run inside an existing transaction (for atomic transfer+merge).
   */
  private async mergeOrdersInTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    targetOrderId: string,
    sourceOrderId: string,
  ) {
    const MERGEABLE_STATUSES = new Set<string>(ACTIVE_ORDER_STATUSES);

    const [target, source] = await Promise.all([
      tx.order.findFirst({
        where: { id: targetOrderId, tenantId },
        select: {
          id: true,
          status: true,
          tableId: true,
          branchId: true,
          tenant: { select: { businessType: true } },
        },
      }),
      tx.order.findFirst({
        where: { id: sourceOrderId, tenantId },
        include: {
          items: { include: { modifiers: true, tickets: true } },
          payments: true,
        },
      }),
    ]);

    if (!target) throw new NotFoundException('Target order not found');
    if (!source) throw new NotFoundException('Source order not found');

    if (target.tenant.businessType !== BusinessType.RESTAURANT) {
      throw new BadRequestException(
        'Order merging is only available for restaurant orders',
      );
    }

    if (!MERGEABLE_STATUSES.has(target.status)) {
      throw new BadRequestException(
        `Target order status "${target.status}" does not allow merging`,
      );
    }
    if (!MERGEABLE_STATUSES.has(source.status)) {
      throw new BadRequestException(
        `Source order status "${source.status}" does not allow merging`,
      );
    }

    if (!target.tableId || !source.tableId) {
      throw new BadRequestException(
        'Both orders must be assigned to a table to merge',
      );
    }
    if (target.tableId !== source.tableId) {
      throw new BadRequestException(
        'Both orders must be on the same table to merge',
      );
    }

    // Move items + payments, cancel source
    await tx.orderItem.updateMany({
      where: { orderId: sourceOrderId },
      data: { orderId: targetOrderId },
    });
    if (source.payments.length > 0) {
      await tx.payment.updateMany({
        where: { orderId: sourceOrderId },
        data: { orderId: targetOrderId },
      });
    }
    await tx.order.update({
      where: { id: sourceOrderId },
      data: { status: OrderStatus.CANCELLED },
    });
    await this.recordTransition(
      tx,
      sourceOrderId,
      source.status,
      OrderStatus.CANCELLED,
    );

    // Recalculate totals
    const allItems = await tx.orderItem.findMany({
      where: { orderId: targetOrderId },
      select: { subtotal: true },
    });
    const subtotal = this.round(
      allItems.reduce((s, i) => s + Number(i.subtotal), 0),
    );
    const targetFull = await tx.order.findUnique({
      where: { id: targetOrderId },
      select: {
        discount: true,
        shippingFee: true,
        includeVAT: true,
        payments: { select: { amount: true } },
      },
    });
    const discount = Number(targetFull?.discount || 0);
    const shippingFee = Number(targetFull?.shippingFee || 0);
    const includeVAT = Boolean(targetFull?.includeVAT);
    const afterDiscount = this.round(
      Math.max(0, subtotal - discount + shippingFee),
    );
    const vat = includeVAT ? this.round(afterDiscount * VAT_RATE) : 0;
    const total = this.round(afterDiscount + vat);

    const paid = this.money(
      (targetFull?.payments || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      ),
    );

    await tx.order.update({
      where: { id: targetOrderId },
      data: {
        subtotal,
        total,
        vat,
        paymentStatus: this.derivePaymentStatus(paid, total),
      },
    });

    return tx.order.findUnique({
      where: { id: targetOrderId },
      include: {
        items: {
          include: {
            product: true,
            modifiers: { include: { modifier: true } },
          },
        },
        payments: true,
        customer: true,
        table: true,
      },
    });
  }

  /**
   * Find the active (unpaid) order for a specific table
   * Returns null if no active order exists
   */
  async findActiveOrderByTableId(tenantId: string, tableId: string) {
    return this.prisma.order.findFirst({
      where: {
        tenantId,
        tableId,
        status: { in: this.ACTIVE_ORDER_STATUSES },
      },
      include: {
        items: {
          include: {
            product: true,
            modifiers: {
              include: { modifier: true },
            },
          },
        },
        table: true,
        customer: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ----------------------------------------------------
     TOTALS
  ---------------------------------------------------- */

  async recalculateOrderTotals(
    tenantId: string,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;

    const items = await db.orderItem.findMany({
      where: { orderId },
      select: { subtotal: true },
    });

    const subtotal = this.round(
      items.reduce((s, i) => s + Number(i.subtotal), 0),
    );

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        discount: true,
        shippingFee: true,
        includeVAT: true,
        status: true,
        paymentStatus: true,
        customerId: true,
        loyaltyRedeemedPoints: true,
        loyaltyRedeemedAmount: true,
        tenant: { select: { businessType: true } },
        payments: { select: { amount: true } },
      },
    });

    const discount = Number(order?.discount || 0);
    const shippingFee = Number(order?.shippingFee || 0);
    const includeVAT = Boolean(order?.includeVAT);

    // Calculate total before VAT
    const subtotalAfterDiscountAndShipping = this.round(
      Math.max(0, subtotal - discount + shippingFee),
    );

    // Calculate VAT (11%)
    const vat = includeVAT
      ? this.round(subtotalAfterDiscountAndShipping * VAT_RATE)
      : 0;

    const total = this.round(subtotalAfterDiscountAndShipping + vat);

    /* ── Loyalty reconciliation ────────────────────────────────────── */
    let loyaltyUpdate: Record<string, unknown> = {};
    let loyaltyRedeemedAmount = Number(order?.loyaltyRedeemedAmount || 0);

    if (order && order.loyaltyRedeemedPoints > 0 && order.customerId) {
      const program = await this.loyaltyService.getProgram(tenantId);
      if (
        program.isEnabled &&
        program.redeemPointsStep &&
        program.redeemCurrencyPerStep &&
        program.maxRedeemPercent != null
      ) {
        const newEligibleBase = LoyaltyMath.computeEligibleBase(
          subtotal,
          discount,
          0,
        );
        const allowedPoints = LoyaltyMath.computeAllowedRedemption({
          newEligibleBase,
          redeemPointsStep: program.redeemPointsStep,
          redeemCurrencyPerStep: program.redeemCurrencyPerStep,
          maxRedeemPercent: program.maxRedeemPercent,
          currentRedeemedPoints: order.loyaltyRedeemedPoints,
        });

        if (allowedPoints < order.loyaltyRedeemedPoints) {
          const pointsToRestore = order.loyaltyRedeemedPoints - allowedPoints;

          // Recompute the discount for the allowed points
          const newRedemption = LoyaltyMath.computeRedemption({
            requestedPoints: allowedPoints,
            redeemPointsStep: program.redeemPointsStep,
            redeemCurrencyPerStep: program.redeemCurrencyPerStep,
            maxRedeemPercent: program.maxRedeemPercent,
            eligibleBase: newEligibleBase,
          });

          const restoredMoney = LoyaltyMath.toDecimal(
            loyaltyRedeemedAmount,
          ).minus(newRedemption.appliedDiscount);

          // Create RECONCILE_RESTORE ledger entry
          await this.loyaltyService.applyLedgerEntry({
            tenantId,
            customerId: order.customerId,
            orderId,
            type: LoyaltyTransactionType.RECONCILE_RESTORE,
            direction: LoyaltyDirection.CREDIT,
            points: pointsToRestore,
            moneyAmount: restoredMoney,
            idempotencyKey: `order:${orderId}:reconcile-restore:${allowedPoints}:${restoredMoney.toString()}`,
            reason: 'Order modification reduced eligible base',
          });

          loyaltyRedeemedAmount = Number(newRedemption.appliedDiscount);
          loyaltyUpdate = {
            loyaltyRedeemedPoints: allowedPoints,
            loyaltyRedeemedAmount: newRedemption.appliedDiscount,
          };
        }
      }
    }

    // Re-derive the payment axis for the new totals. Refund states are
    // owned by RefundsService and never overwritten here.
    let paymentStatusUpdate: { paymentStatus: PaymentStatus } | undefined;
    if (
      order &&
      order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED &&
      order.paymentStatus !== PaymentStatus.REFUNDED
    ) {
      const paid = this.money(
        order.payments.reduce((sum, p) => sum + Number(p.amount), 0),
      );
      const effectiveTotal = this.money(total - loyaltyRedeemedAmount);
      paymentStatusUpdate = {
        paymentStatus: this.derivePaymentStatus(paid, effectiveTotal),
      };
    }

    return db.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        total,
        vat,
        ...loyaltyUpdate,
        ...paymentStatusUpdate,
      },
    });
  }

  private async earnLoyaltyPoints(
    tenantId: string,
    orderId: string,
    userId?: string,
  ) {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, tenantId },
        select: {
          customerId: true,
          subtotal: true,
          discount: true,
          loyaltyRedeemedAmount: true,
          loyaltyEarnedPoints: true,
        },
      });

      if (!order?.customerId) return;
      if (order.loyaltyEarnedPoints > 0) return; // Already earned (idempotent)

      const program = await this.loyaltyService.getProgram(tenantId);
      if (!program.isEnabled || !program.earnPointsPerCurrency) return;

      const eligibleBase = LoyaltyMath.computeEligibleBase(
        order.subtotal,
        order.discount || 0,
        order.loyaltyRedeemedAmount || 0,
      );

      const earnedPoints = LoyaltyMath.computeEarnedPoints(
        eligibleBase,
        program.earnPointsPerCurrency,
      );

      if (earnedPoints <= 0) return;

      // Snapshot program config at completion time
      const snapshot = {
        earnPointsPerCurrency: Number(program.earnPointsPerCurrency),
        redeemPointsStep: program.redeemPointsStep,
        redeemCurrencyPerStep: program.redeemCurrencyPerStep
          ? Number(program.redeemCurrencyPerStep)
          : null,
        maxRedeemPercent:
          program.maxRedeemPercent != null
            ? Number(program.maxRedeemPercent)
            : null,
      };

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          loyaltyEarnedPoints: earnedPoints,
          loyaltyEligibleBaseAtCompletion: eligibleBase,
          loyaltyProgramSnapshot: snapshot,
          loyaltyCompletedAt: new Date(),
        },
      });

      await this.loyaltyService.applyLedgerEntry({
        tenantId,
        customerId: order.customerId,
        orderId,
        type: LoyaltyTransactionType.EARN,
        direction: LoyaltyDirection.CREDIT,
        points: earnedPoints,
        moneyAmount: eligibleBase,
        idempotencyKey: `order:${orderId}:earn`,
        reason: `Earned ${earnedPoints} points on order completion`,
        actorUserId: userId,
      });

      this.logger.log(
        `Loyalty earn: order=${orderId} pts=${earnedPoints} base=${eligibleBase.toString()}`,
      );
    } catch (err) {
      this.logger.error(
        `[earnLoyaltyPoints] Failed for order ${orderId}:`,
        err,
      );
    }
  }

  private money(value: number): number {
    return Math.round(value * 100) / 100;
  }

  async addOfferItemsToOrder(
    tenantId: string,
    orderId: string,
    dto: AddOfferItemsDto,
  ) {
    // 1. Validate order is in editable state
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: {
        status: true,
        tenant: { select: { businessType: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isRestaurant = order.tenant.businessType === BusinessType.RESTAURANT;
    if (isRestaurant) {
      if (!EDITABLE_ORDER_STATUSES.includes(order.status)) {
        throw new BadRequestException(
          'Cannot add offer items: order is not in an editable state',
        );
      }
    } else if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        'Cannot add offer items: order must be in DRAFT state',
      );
    }

    // 2. Get authoritative pricing from OffersService
    const preview = await this.offersService.pricePreview(tenantId, {
      offerId: dto.offerId,
      selections: dto.selections,
    });

    if (!preview.isValid) {
      throw new BadRequestException({
        message: 'Offer selection is invalid',
        errors: preview.validationErrors,
      });
    }

    // 3. Calculate per-item pricing
    //    basePrice is distributed proportionally across all selected items.
    //    Each item's final unitPrice = (basePriceShare) + extraPrice - freeDiscount
    const allItems: Array<{
      productId: string;
      productName: string;
      unitPrice: number;
    }> = [];

    const totalRetailPrice = preview.groups.reduce((sum, g) => {
      return sum + g.items.reduce((s, i) => s + i.retailPrice, 0);
    }, 0);

    const totalSelections = preview.groups.reduce(
      (sum, g) => sum + g.items.length,
      0,
    );

    if (totalSelections === 0) {
      throw new BadRequestException('No valid items in offer selection');
    }

    let basePriceRemainder = preview.basePrice;

    for (let gIdx = 0; gIdx < preview.groups.length; gIdx++) {
      const group = preview.groups[gIdx];
      for (let iIdx = 0; iIdx < group.items.length; iIdx++) {
        const item = group.items[iIdx];
        const isLastItem =
          gIdx === preview.groups.length - 1 && iIdx === group.items.length - 1;

        let basePriceShare = 0;
        if (totalRetailPrice > 0) {
          basePriceShare = this.round(
            (item.retailPrice / totalRetailPrice) * preview.basePrice,
          );
        } else {
          basePriceShare = this.round(preview.basePrice / totalSelections);
        }

        if (isLastItem) {
          basePriceShare = this.round(basePriceRemainder);
        } else {
          basePriceRemainder = this.round(basePriceRemainder - basePriceShare);
        }

        const freeDiscount = item.isFree ? item.extraPrice : 0;
        const unitPrice = this.round(
          basePriceShare + item.extraPrice - freeDiscount,
        );

        allItems.push({
          productId: item.productId,
          productName: item.productName,
          unitPrice: Math.max(0, unitPrice),
        });
      }
    }

    // 4. Create OrderItems inside a transaction and recalculate totals atomically
    return await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.createMany({
        data: allItems.map((item) => {
          const subtotal = this.round(item.unitPrice * 1);
          return {
            orderId,
            productId: item.productId,
            quantity: 1,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            subtotal: new Prisma.Decimal(subtotal),
            total: new Prisma.Decimal(subtotal),
            notes: `Offer: ${preview.offerName}`,
          };
        }),
      });

      // 5. Recalculate order totals (VAT, discount, loyalty)
      return this.recalculateOrderTotals(tenantId, orderId, tx);
    });
  }
}
