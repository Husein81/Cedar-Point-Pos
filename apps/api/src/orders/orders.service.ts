import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessType, OrderStatus, OrderType, QueryParams } from '@repo/types';
import { PaymentMethod, Prisma } from '../../generated/prisma/client.js';
import { InventoryDeductionService } from '../inventory/inventory-deduction.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AddItemDto } from './dto/add-item.dto.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';

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

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryDeductionService: InventoryDeductionService,
  ) {}
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
    } = dto;

    // Fetch tenant info and branch order count in parallel
    const [tenant, orderCount] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { businessType: true },
      }),
      this.prisma.order.count({ where: { branchId } }),
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

    const orderNumber = `${branchId.slice(-4)}-${String(orderCount + 1).padStart(5, '0')}`;

    let subtotal = 0;
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    // Fetch products only if items exist, and do it in parallel with validation
    if (items?.length) {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: items.map((i) => i.productId) },
          tenantId,
          isDeleted: false,
        },
        select: {
          id: true,
          price: true,
        },
      });

      const map = new Map(products.map((p) => [p.id, p]));

      for (const item of items) {
        const product = map.get(item.productId);
        if (!product) throw new BadRequestException('Product not found');

        // Use override price or product price
        const unitPrice =
          'unitPrice' in item && typeof item.unitPrice === 'number'
            ? item.unitPrice
            : Number(product.price);
        let lineSubtotal = unitPrice * item.quantity;

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
        });
      }
    }

    subtotal = this.round(subtotal);

    if (discount && discount > subtotal) {
      throw new BadRequestException('Order discount cannot exceed subtotal');
    }

    const orderType =
      shippingFee && shippingFee > 0 ? OrderType.DELIVERY : type;

    const total = this.round(
      Math.max(0, Number(subtotal) - (discount || 0) + (shippingFee || 0)),
    );

    return this.prisma.order.create({
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
        ...(tableId && { tableId }),
        ...(customerId && { customerId }),
        items: { create: orderItems },
      },
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
          include: { product: true },
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
            include: { product: true },
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
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: {
        status: true,
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

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        ...(nextStatus === OrderStatus.COMPLETED && {
          completedAt: new Date(),
        }),
      },
    });

    // 2️⃣ Deduct stock AFTER status becomes COMPLETED
    if (nextStatus === OrderStatus.COMPLETED) {
      await this.inventoryDeductionService.deductStockForOrder(
        tenantId,
        orderId,
        order.branchId,
        userId,
      );
    }

    return updated;
  }

  /* ----

  /**
   * Process a single payment for an order
   * - Creates Payment record
   * - Marks order as PAID if fully paid
   * - Deducts inventory ONCE when fully paid
   */
  async processPayment(
    tenantId: string,
    orderId: string,
    payment: {
      amount: number;
      method: PaymentMethod;
      currencyCode?: string;
      exchangeRate?: number;
    },
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
            total: true,
            shippingFee: true,
            branchId: true,
            payments: { select: { amount: true } },
          },
        });

        if (!order) throw new NotFoundException('Order not found');

        if (order.status === OrderStatus.CANCELLED) {
          throw new BadRequestException('Cannot pay a cancelled order');
        }

        const totalDue = this.money(
          Number(order.total) + Number(order.shippingFee),
        );

        const alreadyPaid = this.money(
          order.payments.reduce((sum, p) => sum + Number(p.amount), 0),
        );

        const newPaidTotal = this.money(
          alreadyPaid + Number(payment.amount) + Number(order.shippingFee),
        );

        if (payment.method !== PaymentMethod.CASH && newPaidTotal > totalDue) {
          throw new BadRequestException(
            `Payment exceeds total. Paid: ${newPaidTotal}, Due: ${totalDue}`,
          );
        }

        const isFullyPaid = newPaidTotal === totalDue;
        console.log('isFullyPaid', isFullyPaid, newPaidTotal, totalDue);
        // 1️⃣ Create payment record
        await tx.payment.create({
          data: {
            orderId,
            amount: payment.amount,
            method: payment.method,
            currencyCode: payment.currencyCode,
            exchangeRate: payment.exchangeRate,
          },
        });

        // 2️⃣ Update order status if needed
        if (isFullyPaid) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.COMPLETED },
          });

          // 3️⃣ Deduct inventory ONCE
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

        const change =
          payment.method === PaymentMethod.CASH
            ? this.money(Math.max(0, newPaidTotal - totalDue))
            : 0;

        return {
          orderId,
          status: isFullyPaid ? OrderStatus.COMPLETED : OrderStatus.PENDING,
          totalDue,
          paid: this.money(Math.min(newPaidTotal, totalDue)),
          remaining: this.money(Math.max(0, totalDue - newPaidTotal)),
          change,
        };
      },
      {
        isolationLevel: 'Serializable',
      },
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
      select: { discount: true },
    });

    const total = this.round(subtotal - Number(order?.discount || 0));

    return this.prisma.order.update({
      where: { id: orderId },
      data: { subtotal, total },
    });
  }

  private money(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
