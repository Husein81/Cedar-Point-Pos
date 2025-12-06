import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  prisma,
  OrderStatus,
  OrderType,
  BusinessType,
  Order,
  OrderItem,
} from '@repo/db';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryParams } from '@repo/types';

@Injectable()
export class OrdersService {
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

    return this.formatOrder(order);
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

    return this.formatOrder(order);
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
    },
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const { status, branchId, userId, type } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(branchId && { branchId }),
      ...(userId && { userId }),
      ...(type && { type }),
    };

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
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: orders.map((order) => this.formatOrder(order)),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Format order response with decimal conversions
   */
  private formatOrder(order: Order & { items: OrderItem[] }) {
    return {
      ...order,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      total: Number(order.total),
      discount: order.discount ? Number(order.discount) : null,
      items: order.items?.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        taxAmount: Number(item.taxAmount),
        total: Number(item.total),
      })),
    };
  }
}
