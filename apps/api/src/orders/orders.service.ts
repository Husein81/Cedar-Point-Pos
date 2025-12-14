import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, prisma, OrderStatus, OrderType, BusinessType } from '@repo/db';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryParams } from '@repo/types';
import { InventoryDeductionService } from '@/inventory/inventory-deduction.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly inventoryDeductionService: InventoryDeductionService,
  ) {}

  /**
   * Create a new order in DRAFT status
   */
  async create(
    tenantId: string,
    userId: string,
    createOrderDto: CreateOrderDto,
  ) {
    const { branchId, type, tableId, deviceId, shiftId, customerId, items } =
      createOrderDto;

    // Validate branch exists and belongs to tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Get tenant to check business type
    const tenant = await prisma.tenant.findUnique({
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
        const table = await prisma.table.findFirst({
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
      const device = await prisma.pOSDevice.findFirst({
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
      const shift = await prisma.shift.findFirst({
        where: { id: shiftId, tenantId },
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }
    }

    // Validate customer if provided
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    // Generate order number (simple sequential number)
    const orderCount = await prisma.order.count({
      where: { tenantId, branchId },
    });
    const orderNumber = `${branchId.slice(-4).toUpperCase()}-${String(orderCount + 1).padStart(4, '0')}`;

    // If items are provided, validate products and calculate totals
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
      ...(tableId && { table: { connect: { id: tableId } } }),
      ...(deviceId && { device: { connect: { id: deviceId } } }),
      ...(shiftId && { shift: { connect: { id: shiftId } } }),
      ...(customerId && { customer: { connect: { id: customerId } } }),
    };

    if (items && items.length > 0) {
      // Validate all products exist
      const productIds = items.map((item) => item.productId);
      const products = await prisma.product.findMany({
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

      // Calculate totals
      let subtotal = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);

      const orderItems = items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }

        const quantity = new Prisma.Decimal(item.quantity);
        const unitPrice = product.price || new Prisma.Decimal(0);
        const itemSubtotal = quantity.times(unitPrice);

        // Calculate tax
        const taxRate = product.tax?.rate || new Prisma.Decimal(0);
        const itemTaxAmount = itemSubtotal.times(taxRate).dividedBy(100);
        const itemTotal = itemSubtotal.plus(itemTaxAmount);

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
        };
      });

      const total = subtotal.plus(taxAmount);

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
    const order = await prisma.order.create({
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
    const order = await prisma.order.findFirst({
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
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
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
      sortBy,
      sortOrder,
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
    if (sortBy) {
      orderBy[sortBy as keyof Prisma.OrderOrderByWithRelationInput] =
        sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [totalCount, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
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
  async completeOrder(tenantId: string, orderId: string) {
    const order = await prisma.order.findFirst({
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
      );

    // Update order status to COMPLETED
    const completedOrder = await prisma.order.update({
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
  async updateStatus(tenantId: string, orderId: string, status: OrderStatus) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // If completing the order, use the complete order flow
    if (status === OrderStatus.COMPLETED) {
      return this.completeOrder(tenantId, orderId);
    }

    // For other status updates, just update the status
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === OrderStatus.CANCELLED && { completedAt: new Date() }),
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
  }

  /**
   * Preview stock deductions for an order
   * Shows what will be deducted without executing
   */
  async previewOrderStockDeductions(tenantId: string, orderId: string) {
    const order = await prisma.order.findFirst({
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
}
