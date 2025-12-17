import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QueryParams, OrderStatus, OrderType, BusinessType } from '@repo/types';
import { InventoryDeductionService } from '../inventory/inventory-deduction.service.js';
import type { AddItemDto } from './dto/add-item.dto.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly inventoryDeductionService: InventoryDeductionService,
    private prisma: PrismaService,
  ) {}

  private calculateItemTotals(
    quantity: number,
    unitPrice: number,
    modifiersTotal: number,
    taxRate: number,
  ): {
    itemSubtotal: number;
    itemTaxAmount: number;
    itemTotal: number;
  } {
    const itemSubtotal = quantity * unitPrice + modifiersTotal;
    const itemTaxAmount = itemSubtotal * (taxRate / 100);

    const itemTotal = itemSubtotal + itemTaxAmount;

    return {
      itemSubtotal,
      itemTaxAmount,
      itemTotal,
    };
  }

  async recalculateOrderTotals(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        items: {
          include: {
            modifiers: true,
            product: {
              include: {
                tax: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    let subtotal = 0;
    let taxAmount = 0;
    for (const item of order.items) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const modifiersTotal = item.modifiers.reduce(
        (sum, mod) => sum + Number(mod.price),
        0,
      );
      const taxRate = Number(item.product.tax?.rate);
      const { itemSubtotal, itemTaxAmount, itemTotal } =
        this.calculateItemTotals(quantity, unitPrice, modifiersTotal, taxRate);
      await this.prisma.orderItem.update({
        where: { id: String(item.id) },
        data: {
          taxRate,
          taxAmount: itemTaxAmount,
          total: itemTotal,
        },
      });
      subtotal = subtotal + itemSubtotal;
      taxAmount = taxAmount + itemTaxAmount;
    }
    const discount = order.discount || 0;
    const total = subtotal + taxAmount - Number(discount);
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        taxAmount,
        total,
      },
      include: {
        items: {
          include: {
            modifiers: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            name: true,
          },
        },
        device: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return updatedOrder;
  }

  async create(
    tenantId: string,
    userId: string,
    createOrderDto: CreateOrderDto,
  ) {
    const {
      branchId,
      type,
      tableId,
      deviceId,
      shiftId,
      customerId,
      items,
      discount,
    } = createOrderDto;

    // Validate branch exists and belongs to tenant
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Get tenant to check business type
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Validate order type for restaurant business
    if (tenant.businessType === BusinessType.RESTAURANT) {
      if (
        ![OrderType.DINE_IN, OrderType.TAKEAWAY, OrderType.DELIVERY].includes(
          type,
        )
      ) {
        throw new BadRequestException(
          'Invalid order type for restaurant business',
        );
      }

      // For DINE_IN orders, table is recommended
      if (type === OrderType.DINE_IN && tableId) {
        const table = await this.prisma.table.findFirst({
          where: { id: tableId, branchId, tenantId },
        });

        if (!table) {
          throw new NotFoundException('Table not found');
        }

        if (!table.isActive) {
          throw new BadRequestException('Table is not active');
        }
      }
    }

    // Validate device if provided
    if (deviceId) {
      const device = await this.prisma.pOSDevice.findFirst({
        where: { id: deviceId, branchId, tenantId },
      });

      if (!device) {
        throw new NotFoundException('Device not found');
      }

      if (!device.isActive) {
        throw new BadRequestException('Device is not active');
      }
    }

    // Validate shift if provided
    if (shiftId) {
      const shift = await this.prisma.shift.findFirst({
        where: { id: shiftId, tenantId },
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }
    }

    // Validate customer if provided
    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    // Generate order number (simple sequential number)
    const orderCount = await this.prisma.order.count({
      where: { tenantId, branchId },
    });
    const orderNumber = `${branchId.slice(-4).toUpperCase()}-${String(orderCount + 1).padStart(4, '0')}`;

    const orderDiscount = discount
      ? new Prisma.Decimal(discount)
      : new Prisma.Decimal(0);

    let orderData: Prisma.OrderCreateInput = {
      tenant: { connect: { id: tenantId } },
      branch: { connect: { id: branchId } },
      user: { connect: { id: userId } },
      type,
      status: OrderStatus.DRAFT,
      orderNumber,
      subtotal: new Prisma.Decimal(0),
      taxAmount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(0),
      discount: orderDiscount,
      ...(tableId && { table: { connect: { id: tableId } } }),
      ...(deviceId && { device: { connect: { id: deviceId } } }),
      ...(shiftId && { shift: { connect: { id: shiftId } } }),
      ...(customerId && { customer: { connect: { id: customerId } } }),
    };

    if (items && items.length > 0) {
      // Validate all products exist
      const productIds = items.map((item) => item.productId);
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          tenantId,
        },
        include: {
          tax: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('One or more products not found');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      const allModifierIds = items
        .flatMap((item) => item.modifiers || [])
        .filter((id) => id);

      let modifierMap = new Map<
        string,
        Awaited<ReturnType<typeof this.prisma.modifier.findMany>>[number]
      >();

      if (allModifierIds.length > 0) {
        const modifiers = await this.prisma.modifier.findMany({
          where: {
            id: { in: allModifierIds },
            tenantId,
            isDeleted: false,
          },
        });

        modifierMap = new Map(modifiers.map((m) => [m.id, m]));

        const foundModifierIds = new Set(modifiers.map((m) => m.id));
        const missingModifiers = allModifierIds.filter(
          (id) => !foundModifierIds.has(id),
        );

        if (missingModifiers.length > 0) {
          throw new BadRequestException(
            `One or more modifiers not found: ${missingModifiers.join(', ')}`,
          );
        }
      }

      let subtotal = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);

      const orderItems = items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }

        const quantity = item.quantity;
        const unitPrice = Number(product.price || 0);

        const itemModifiers = (item.modifiers || [])
          .map((modifierId) => modifierMap.get(modifierId))
          .filter(
            (
              m,
            ): m is Awaited<
              ReturnType<typeof this.prisma.modifier.findMany>
            >[number] => m !== undefined,
          );

        const modifiersTotal = itemModifiers.reduce(
          (sum, mod) => sum + Number(mod.price),
          0,
        );

        const taxRate = Number(product.tax?.rate) || 0;
        const { itemSubtotal, itemTaxAmount, itemTotal } =
          this.calculateItemTotals(
            quantity,
            unitPrice,
            modifiersTotal,
            taxRate,
          );

        subtotal = subtotal.plus(itemSubtotal);
        taxAmount = taxAmount.plus(itemTaxAmount);

        return {
          productId: item.productId,
          quantity,
          unitPrice,
          taxRate,
          taxAmount: itemTaxAmount,
          total: itemTotal,
          notes: item.notes,
          modifiers: {
            create: itemModifiers.map((modifier) => ({
              modifierId: modifier.id,
              price: modifier.price,
            })),
          },
        };
      });
      const total = subtotal.plus(taxAmount).minus(orderDiscount);

      orderData = {
        ...orderData,
        subtotal,
        taxAmount,
        total,
        items: {
          create: orderItems,
        },
      };
    }

    // Create order
    const order = await this.prisma.order.create({
      data: orderData,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            name: true,
          },
        },
        device: {
          select: {
            id: true,
            name: true,
          },
        },
        shift: {
          select: {
            id: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return order;
  }

  /**
   * Get order by ID
   */
  async findOne(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            name: true,
          },
        },
        device: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Get all orders with filters
   */
  async findAll(
    tenantId: string,
    params: QueryParams & {
      status?: OrderStatus;
      branchId?: string;
      userId?: string;
      type?: OrderType;
      startDate?: string;
      endDate?: string;
      tableId?: string;
    },
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const {
      status,
      branchId,
      userId,
      type,
      startDate,
      endDate,
      tableId,
      search,
      sort,
      order,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(branchId && { branchId }),
      ...(userId && { userId }),
      ...(type && { type }),
      ...(tableId && { tableId }),
      ...(search && {
        orderNumber: { contains: search, mode: 'insensitive' },
      }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const orderBy: Prisma.OrderOrderByWithRelationInput = {};
    if (sort) {
      orderBy[sort as keyof Prisma.OrderOrderByWithRelationInput] =
        order || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [totalCount, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          table: {
            select: {
              id: true,
              tableNumber: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Complete an order and deduct stock
   * Handles both regular products and recipe-based ingredient deduction
   */
  async completeOrder(tenantId: string, orderId: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Order is already completed');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled order');
    }

    // Deduct stock (validates and executes atomically)
    const deductionResult =
      await this.inventoryDeductionService.deductStockForOrder(
        tenantId,
        orderId,
        order.branchId,
        userId,
      );

    // Update order status to COMPLETED
    const completedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Order ${orderId} completed with ${deductionResult.deductionsApplied} stock deductions`,
    );

    return {
      ...completedOrder,
      stockDeductions: deductionResult,
    };
  }

  /**
   * Update order status
   * If status is COMPLETED, triggers stock deduction
   */
  async updateStatus(
    tenantId: string,
    orderId: string,
    nextStatus: OrderStatus,
  ) {
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.DRAFT]: [OrderStatus.PENDING],
      [OrderStatus.PENDING]: [OrderStatus.SENT_TO_KITCHEN],
      [OrderStatus.SENT_TO_KITCHEN]: [OrderStatus.READY],
      [OrderStatus.READY]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    return await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Load minimal order data
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          tenantId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // 2️⃣ COMPLETED must go through completeOrder()
      if (nextStatus === OrderStatus.COMPLETED) {
        if (order.status !== OrderStatus.READY) {
          throw new BadRequestException(
            `Order must be READY before completing`,
          );
        }

        // Delegate to your existing logic
        return this.completeOrder(tenantId, orderId);
      }

      // 3️⃣ Prevent transitions from terminal states
      if (
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.CANCELLED
      ) {
        throw new BadRequestException(
          `Cannot change status of a ${order.status} order`,
        );
      }

      // 4️⃣ Enforce strict transition order
      const allowedNextStatuses = allowedTransitions[order.status];

      if (!allowedNextStatuses.includes(nextStatus)) {
        throw new BadRequestException(
          `Invalid order status transition: ${order.status} → ${nextStatus}`,
        );
      }

      // 5️⃣ Business validations per transition
      if (nextStatus === OrderStatus.SENT_TO_KITCHEN) {
        const hasItems = await tx.orderItem.findFirst({
          where: { orderId },
          select: { id: true },
        });

        if (!hasItems) {
          throw new BadRequestException(
            'Cannot send an empty order to kitchen',
          );
        }
      }

      // 6️⃣ Apply status update
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return updated;
    });
  }

  async updateDiscount(
    tenantId: string,
    orderId: string,
    discount: number,
  ): Promise<
    Awaited<
      ReturnType<
        typeof this.prisma.order.findFirst<{
          include: {
            items: {
              include: {
                modifiers: true;
                product: {
                  include: { tax: true };
                };
              };
            };
            user: { select: { id: true; name: true; email: true } };
            branch: { select: { id: true; name: true } };
            table: { select: { id: true; tableNumber: true; name: true } };
            device: { select: { id: true; name: true } };
            customer: { select: { id: true; name: true; phone: true } };
          };
        }>
      >
    >
  > {
    if (discount < 0) {
      throw new BadRequestException('Discount cannot be negative');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot modify discount on completed order',
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot modify discount on cancelled order',
      );
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        discount: new Prisma.Decimal(discount),
      },
    });
    return this.recalculateOrderTotals(tenantId, orderId);
  }

  /**
   * Preview stock deductions for an order
   * Shows what will be deducted without executing
   */
  async previewOrderStockDeductions(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const items = order.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    }));

    return this.inventoryDeductionService.previewStockDeductions(
      tenantId,
      order.branchId,
      items,
    );
  }

  /**
   * Send order to kitchen
   * Updates status to SENT_TO_KITCHEN and creates KDS tickets
   */
  async sendToKitchen(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Cannot send order with status ${order.status} to kitchen`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.SENT_TO_KITCHEN },
      });

      if (order.items.length > 0) {
        await tx.orderItemTicket.createMany({
          data: order.items.map((item) => ({
            orderItemId: item.id,
            status: OrderStatus.SENT_TO_KITCHEN,
            station: 'Main Kitchen', // Default station for now
          })),
        });
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              tickets: true,
              product: { select: { id: true, name: true } },
            },
          },
        },
      });
    });
  }

  /**
   * Add a product item to an existing order
   * Only allowed for DRAFT orders
   */
  async addItemToOrder(
    tenantId: string,
    orderId: string,
    addItemDto: AddItemDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Cannot add items to a completed order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot add items to a cancelled order');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: addItemDto.productId,
        tenantId,
        isDeleted: false,
      },
      include: {
        tax: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
    let modifierMap = new Map<
      string,
      Awaited<ReturnType<typeof this.prisma.modifier.findMany>>[number]
    >();

    if (addItemDto.modifiers && addItemDto.modifiers.length > 0) {
      const modifiers = await this.prisma.modifier.findMany({
        where: {
          id: { in: addItemDto.modifiers },
          tenantId,
          isDeleted: false,
        },
      });

      modifierMap = new Map(modifiers.map((m) => [m.id, m]));

      const foundModifierIds = new Set(modifiers.map((m) => m.id));
      const missingModifiers = addItemDto.modifiers.filter(
        (id) => !foundModifierIds.has(id),
      );

      if (missingModifiers.length > 0) {
        throw new BadRequestException(
          `One or more modifiers not found: ${missingModifiers.join(', ')}`,
        );
      }
    }
    const quantity = Number(addItemDto.quantity);
    const unitPrice = Number(product.price || 0);

    const itemModifiers = (addItemDto.modifiers || [])
      .map((modifierId) => modifierMap.get(modifierId))
      .filter(
        (
          m,
        ): m is Awaited<
          ReturnType<typeof this.prisma.modifier.findMany>
        >[number] => m !== undefined,
      );

    const modifiersTotal = itemModifiers.reduce(
      (sum, mod) => sum + Number(mod.price),
      0,
    );

    const taxRate = Number(product.tax?.rate) || 0;
    const { itemTaxAmount, itemTotal } = this.calculateItemTotals(
      quantity,
      unitPrice,
      modifiersTotal,
      taxRate,
    );
    await this.prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        quantity,
        unitPrice,
        taxRate,
        taxAmount: itemTaxAmount,
        total: itemTotal,
        notes: addItemDto.notes,
        modifiers: {
          create: itemModifiers.map((modifier) => ({
            modifierId: modifier.id,
            price: modifier.price,
          })),
        },
      },
    });

    return this.recalculateOrderTotals(tenantId, orderId);
  }

  async updateItemQuantity(
    tenantId: string,
    orderId: string,
    orderItemId: string,
    quantity: number,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Cannot update items in a completed order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot update items in a cancelled order');
    }

    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        orderId: order.id,
      },
      include: {
        modifiers: true,
        product: {
          include: {
            tax: true,
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const newQuantity = Number(quantity);
    const unitPrice = Number(orderItem.unitPrice || 0);

    const modifiersTotal = orderItem.modifiers.reduce(
      (sum, mod) => sum + Number(mod.price),
      0,
    );

    const taxRate = Number(orderItem.product.tax?.rate) || 0;
    const { itemTaxAmount, itemTotal } = this.calculateItemTotals(
      newQuantity,
      unitPrice,
      modifiersTotal,
      taxRate,
    );

    await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        quantity: newQuantity,
        taxRate,
        taxAmount: itemTaxAmount,
        total: itemTotal,
      },
    });

    return this.recalculateOrderTotals(tenantId, orderId);
  }

  async removeItemFromOrder(
    tenantId: string,
    orderId: string,
    orderItemId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot remove items from a completed order',
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot remove items from a cancelled order',
      );
    }
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        orderId: order.id,
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }
    await this.prisma.orderItem.delete({
      where: { id: orderItemId },
    });

    return this.recalculateOrderTotals(tenantId, orderId);
  }

  async assignTableToOrder(tenantId: string, orderId: string, tableId: string) {
    const orderInclude = {
      items: {
        include: {
          modifiers: true,
          product: {
            include: { tax: true },
          },
        },
      },
      user: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true } },
      table: { select: { id: true, tableNumber: true, name: true } },
      device: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
    };

    // 1️⃣ Fetch minimal order data (fast & safe)
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      select: {
        id: true,
        status: true,
        branchId: true,
        tableId: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot assign table to a ${order.status.toLowerCase()} order`,
      );
    }

    // 2️⃣ Unassign table
    if (!tableId) {
      return this.prisma.order.update({
        where: { id: orderId },
        data: { tableId: null },
        include: orderInclude,
      });
    }

    // 3️⃣ If same table is already assigned → no-op
    if (order.tableId === tableId) {
      return this.prisma.order.findUnique({
        where: { id: orderId },
        include: orderInclude,
      });
    }

    // 4️⃣ Validate table
    const table = await this.prisma.table.findFirst({
      where: {
        id: tableId,
        branchId: order.branchId,
        tenantId,
        isDeleted: false,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    if (!table.isActive) {
      throw new BadRequestException('Table is not active');
    }

    const activeOrderStatuses: OrderStatus[] = [
      OrderStatus.DRAFT,
      OrderStatus.PENDING,
      OrderStatus.SENT_TO_KITCHEN,
      OrderStatus.READY,
    ];

    // 5️⃣ Transaction → prevents race conditions
    return this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findFirst({
        where: {
          tenantId,
          tableId,
          status: { in: activeOrderStatuses },
          id: { not: orderId },
        },
        select: { id: true },
      });

      if (existingOrder) {
        throw new BadRequestException(
          'Table is already occupied by another active order',
        );
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          tableId,
        },
        include: orderInclude,
      });
    });
  }
}
