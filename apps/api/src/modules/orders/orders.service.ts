import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessType, OrderStatus, OrderType, QueryParams } from '@repo/types';
import { PaymentMethod, Prisma } from '../../generated/prisma/client.js';
import { InventoryDeductionService } from '../inventory/inventory-deduction.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TableStatusService } from '../tables/table-status.service.js';
import type { AddItemDto } from './dto/add-item.dto.js';
import type { CreateOrderDto, PaymentDto } from './dto/create-order.dto.js';

// Extended QueryParams for order-specific filtering
interface OrderQueryParams extends QueryParams {
  status?: OrderStatus;
  branchId?: string;
  userId?: string;
  type?: OrderType;
  startDate?: string;
  endDate?: string;
  tableId?: string;
}

const VAT_RATE = 0.11; // 11% VAT

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryDeductionService: InventoryDeductionService,
    private readonly tableStatusService: TableStatusService,
  ) { }
  private round(v: number) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  private validateTransition(
    businessType: BusinessType,
    current: OrderStatus,
    next: OrderStatus,
  ) {
    // Retail: DRAFT → ON_HOLD/PENDING/COMPLETED/CANCELLED
    const retail: Partial<Record<OrderStatus, OrderStatus[]>> = {
      DRAFT: [
        OrderStatus.ON_HOLD,
        OrderStatus.PENDING,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ],
      ON_HOLD: [OrderStatus.DRAFT, OrderStatus.CANCELLED],
      PENDING: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      COMPLETED: [],
      CANCELLED: [],
    };

    // Restaurant: DRAFT → CONFIRMED → IN_PROGRESS → READY → COMPLETED
    const restaurant: Partial<Record<OrderStatus, OrderStatus[]>> = {
      DRAFT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      CONFIRMED: [OrderStatus.IN_PROGRESS, OrderStatus.SENT_TO_KITCHEN],
      SENT_TO_KITCHEN: [OrderStatus.IN_PROGRESS],
      IN_PROGRESS: [OrderStatus.READY],
      READY: [OrderStatus.COMPLETED],
      COMPLETED: [],
      CANCELLED: [],
    };

    const map = businessType === BusinessType.RESTAURANT ? restaurant : retail;
    const allowed = map[current] ?? [];

    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid ${businessType} transition: ${current} → ${next}`,
      );
    }
  }

  /* ----------------------------------------------------
     CREATE
  ---------------------------------------------------- */

  async create(tenantId: string, userId: string, dto: CreateOrderDto) {
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
    } = dto;

    // Fetch tenant info and branch order count in parallel
    const [tenant, orderCount] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { businessType: true },
      }),
      this.prisma.order.count({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
        },
      }),
    ]);

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

    const orderNumber = `${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, '0')}`;

    let subtotal = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    // Fetch products only if items exist, and do it in parallel with validation
    if (items?.length) {
      // Collect all modifier IDs from all items
      const allModifierIds = items
        .filter((i) => i.modifiers?.length)
        .flatMap((i) => i.modifiers || []);

      // Fetch products and modifiers in parallel
      const [products, modifiers] = (await Promise.all([
        this.prisma.product.findMany({
          where: {
            id: { in: items.map((i) => i.productId) },
            tenantId,
            isDeleted: false,
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
              isDeleted: false,
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

        // Use override price or product price
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

        // Include modifier prices in line subtotal
        let lineSubtotal = (unitPrice + modifiersTotal) * item.quantity;

        // Apply item-level discount if present
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
              type: (discount as Record<string, unknown>).type as string,
              value: (discount as Record<string, unknown>).value as number,
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

    // Calculate VAT (11%) on subtotal after discount and shipping
    const subtotalAfterDiscountAndShipping = this.round(
      Math.max(0, Number(subtotal) - (discount || 0) + (shippingFee || 0)),
    );
    const vatAmount = includeVAT
      ? this.round(subtotalAfterDiscountAndShipping * VAT_RATE)
      : 0;

    const total = this.round(subtotalAfterDiscountAndShipping + vatAmount);

    // Use transaction to create order and update table status atomically
    return this.prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          tenantId,
          branchId,
          userId,
          type: orderType,
          status: OrderStatus.DRAFT,
          orderNumber,
          subtotal,
          total,
          discount: discount ?? 0,
          shippingFee: shippingFee ?? 0,
          includeVAT: includeVAT ?? false,
          vat: vatAmount,
          ...(tableId && { tableId }),
          ...(customerId && { customerId }),
          items: { create: orderItems },
        }, include: {
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
  }

  /* ----------------------------------------------------
     READ
  ---------------------------------------------------- */

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
          },
        },
        payments: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
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
        orderNumber: { contains: params.search, mode: 'insensitive' },
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
            },
          },
          payments: true,
          customer: true,
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

  /* ----------------------------------------------------
     STATUS UPDATE
  ---------------------------------------------------- */

  async updateStatus(
    tenantId: string,
    orderId: string,
    nextStatus: OrderStatus,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Get order with table info
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        select: {
          status: true,
          tableId: true,
          branchId: true,
          tenant: { select: { businessType: true } },
        },
      });

      if (!order) throw new NotFoundException('Order not found');

      this.validateTransition(
        order.tenant.businessType,
        order.status,
        nextStatus,
      );

      // Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          ...(nextStatus === OrderStatus.COMPLETED && {
            completedAt: new Date(),
          }),
        },
      });

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

      // Deduct stock after status becomes COMPLETED
      if (nextStatus === OrderStatus.COMPLETED) {
        await this.inventoryDeductionService.deductStockForOrder(
          tenantId,
          orderId,
          order.branchId,
          userId,
        );
      }

      return updated;
    });
  }

  /* ----

  /**
   * Process batch or single payment for an order
   * - Creates Payment records for all payments
   * - Marks order as PAID only if fully paid after ALL payments combined
   * - All payments pre-converted to base currency by frontend
   * - Deducts inventory ONCE when fully paid
   */
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

    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, tenantId },
          select: {
            id: true,
            status: true,
            total: true, // ✅ already includes VAT + shipping
            branchId: true,
            currencyCode: true,
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

        /* ============================================
           BATCH CALCULATION IN BASE CURRENCY
        ============================================ */

        const totalDue = this.money(Number(order.total));

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

        await Promise.all(
          payments.map((payment) => {
            const exchangeRate =
              payment.currencyCode &&
                payment.currencyCode !== order.currencyCode
                ? payment.exchangeRate || 1
                : 1;

            const paymentInBase = this.money(payment.amount * exchangeRate);

            return tx.payment.create({
              data: {
                orderId,
                method: payment.method,
                amount: new Prisma.Decimal(paymentInBase), // Store BASE currency
                currencyCode: payment.currencyCode,
                exchangeRate: exchangeRate
                  ? new Prisma.Decimal(exchangeRate)
                  : undefined,
              },
            });
          }),
        );

        /* ============================================
           UPDATE ORDER STATUS
        ============================================ */

        if (isFullyPaid) {
          // Get table info before updating order
          const orderWithTable = await tx.order.findFirst({
            where: { id: orderId },
            select: { tableId: true },
          });

          // For restaurant orders, send to kitchen instead of marking completed
          const isRestaurant =
            order.tenant?.businessType === BusinessType.RESTAURANT;
          const newStatus = isRestaurant
            ? OrderStatus.SENT_TO_KITCHEN
            : OrderStatus.COMPLETED;

          await tx.order.update({
            where: { id: orderId },
            data: {
              status: newStatus,
              ...(newStatus === OrderStatus.COMPLETED && {
                completedAt: new Date(),
              }),
            },
          });

          // ✅ Update table status if order was associated with a table
          if (orderWithTable?.tableId) {
            await this.tableStatusService.markTableAvailableIfPossible(
              orderWithTable.tableId,
              orderId,
              tenantId,
              tx,
            );
          }

          // ✅ Deduct inventory ONCE (only for non-restaurant or if completed)
          if (!isRestaurant) {
            await this.inventoryDeductionService.deductStockForOrder(
              tenantId,
              orderId,
              order.branchId,
              userId,
            );
          }
        } else if (order.status === OrderStatus.DRAFT) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.PENDING },
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

        const isRestaurant =
          order.tenant?.businessType === BusinessType.RESTAURANT;
        const finalStatus = isFullyPaid
          ? isRestaurant
            ? OrderStatus.SENT_TO_KITCHEN
            : OrderStatus.COMPLETED
          : OrderStatus.PENDING;

        return {
          orderId,
          status: finalStatus,
          totalDue,
          paid: this.money(Math.min(newTotalPaid, totalDue)),
          remaining: this.money(Math.max(0, totalDue - newTotalPaid)),
          change: changeInfo,
          paymentCount: payments.length,
        };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  /**
   * Process a single payment for an order
   * - Creates Payment record
   * - Marks order as PAID if fully paid
   * - Deducts inventory ONCE when fully paid
   */
  async processPayment_LEGACY(
    tenantId: string,
    orderId: string,
    payment: PaymentDto,
    userId: string,
  ) {
    if (payment.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, tenantId },
          select: {
            id: true,
            status: true,
            total: true, // ✅ already includes VAT + shipping
            branchId: true,
            currencyCode: true,
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
         Order state + inventory
      -------------------------------------------- */

        if (isFullyPaid) {
          // Get table info before updating order
          const orderWithTable = await tx.order.findFirst({
            where: { id: orderId },
            select: { tableId: true },
          });

          await tx.order.update({
            where: { id: orderId },
            data: {
              status: OrderStatus.COMPLETED,
              completedAt: new Date(),
            },
          });

          // ✅ Update table status if order was associated with a table
          if (orderWithTable?.tableId) {
            await this.tableStatusService.markTableAvailableIfPossible(
              orderWithTable.tableId,
              orderId,
              tenantId,
              tx,
            );
          }

          // ✅ Deduct inventory ONCE
          await this.inventoryDeductionService.deductStockForOrder(
            tenantId,
            orderId,
            order.branchId,
            userId,
          );
        } else if (order.status === OrderStatus.DRAFT) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.PENDING },
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
          status: isFullyPaid ? OrderStatus.COMPLETED : OrderStatus.PENDING,

          totalDue,
          paid: this.money(Math.min(newPaidBase, totalDue)),
          remaining: this.money(Math.max(0, totalDue - newPaidBase)),

          change: {
            amount: changeOriginal,
            currency: payment.currencyCode ?? order.currencyCode,
          },
        };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  /* ----------------------------------------------------
     DRAFT MODIFICATIONS
  ---------------------------------------------------- */

  async addItemToOrder(tenantId: string, orderId: string, dto: AddItemDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { status: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.DRAFT)
      throw new BadRequestException('Draft orders only');

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId, isDeleted: false },
    });
    if (!product) throw new NotFoundException('Product not found');

    const subtotal = dto.quantity * Number(product.price);

    await this.prisma.orderItem.create({
      data: {
        orderId,
        productId: product.id,
        quantity: dto.quantity,
        unitPrice: new Prisma.Decimal(product.price || 0),
        subtotal: new Prisma.Decimal(subtotal),
        total: new Prisma.Decimal(subtotal),
        notes: dto.notes,
      },
    });

    return this.recalculateOrderTotals(tenantId, orderId);
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

  async sendToKitchen(tenantId: string, orderId: string, userId: string) {
    return this.updateStatus(
      tenantId,
      orderId,
      OrderStatus.IN_PROGRESS,
      userId,
    );
  }

  async assignTableToOrder(tenantId: string, orderId: string, tableId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { status: true, type: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Verify table exists and belongs to the tenant
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, tenantId, isDeleted: false },
    });
    if (!table) throw new NotFoundException('Table not found');

    // Update the order with the table
    return this.prisma.order.update({
      where: { id: orderId },
      data: { tableId },
      include: {
        table: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Find the active (unpaid) order for a specific table
   * Returns null if no active order exists
   */
  async findActiveOrderByTableId(tenantId: string, tableId: string) {
    // Active order statuses (same as TableStatusService.ACTIVE_ORDER_STATUSES)
    const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
      OrderStatus.DRAFT,
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.IN_PROGRESS,
      OrderStatus.SENT_TO_KITCHEN,
      OrderStatus.READY,
    ];

    return this.prisma.order.findFirst({
      where: {
        tenantId,
        tableId,
        status: { in: ACTIVE_ORDER_STATUSES },
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

  async recalculateOrderTotals(tenantId: string, orderId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      select: { subtotal: true },
    });

    const subtotal = this.round(
      items.reduce((s, i) => s + Number(i.subtotal), 0),
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { discount: true, shippingFee: true, includeVAT: true },
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

    return this.prisma.order.update({
      where: { id: orderId },
      data: { subtotal, total, vat },
    });
  }

  private money(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
