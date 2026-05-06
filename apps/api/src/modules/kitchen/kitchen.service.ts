import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { OrderStatus, QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/browser.js';

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async getKitchenOrders(
    tenantId: string,
    branchId?: string,
    params?: QueryParams,
  ) {
    const { page, limit } = params || {};
    const skip = (Number(page) - 1) * Number(limit);
    const day = Date.now() - 24 * 60 * 60 * 1000;
    const twentyFourHoursAgo = new Date(day);
    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      status: {
        in: [
          'CONFIRMED',
          'IN_PROGRESS',
          'SENT_TO_KITCHEN',
          'READY',
          'PAID',
          'PARTIALLY_PAID',
          'FULLY_REFUNDED',
        ],
      },
      createdAt: {
        gte: twentyFourHoursAgo,
      },
    };
    // Get orders that are in kitchen-relevant statuses
    const [totalCount, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip: skip || 0,
        take: Number(limit) || 10,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
              modifiers: {
                include: {
                  modifier: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              refundItems: {
                select: {
                  id: true,
                  quantity: true,
                  refund: {
                    select: {
                      id: true,
                      refundedAt: true,
                      reason: true,
                    },
                  },
                },
              },
              tickets: {
                orderBy: {
                  sentAt: 'desc',
                },
                take: 1,
              },
            },
          },
          refunds: {
            select: {
              id: true,
              refundedAt: true,
              totalAmount: true,
              reason: true,
              refundItems: {
                select: {
                  id: true,
                  quantity: true,
                  orderItemId: true,
                },
              },
            },
            orderBy: {
              refundedAt: 'desc',
            },
          },
          table: {
            select: {
              id: true,
              name: true,
              tableNumber: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / Number(limit ?? 10)),
      },
    };
  }

  async getOrderById(orderId: string, tenantId: string) {
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
                description: true,
                imageUrl: true,
              },
            },
            modifiers: {
              include: {
                modifier: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            refundItems: {
              select: {
                id: true,
                quantity: true,
                refund: {
                  select: {
                    id: true,
                    refundedAt: true,
                    reason: true,
                  },
                },
              },
            },
            tickets: {
              orderBy: {
                sentAt: 'desc',
              },
            },
          },
        },
        refunds: {
          select: {
            id: true,
            refundedAt: true,
            totalAmount: true,
            reason: true,
            refundItems: {
              select: {
                id: true,
                quantity: true,
                orderItemId: true,
              },
            },
          },
          orderBy: {
            refundedAt: 'desc',
          },
        },
        table: {
          select: {
            id: true,
            name: true,
            tableNumber: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      throw new ForbiddenException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    tenantId: string,
    userId?: string,
  ) {
    // Delegate to the central orders state machine so transitions, settlement
    // guards, inventory deductions, and loyalty earning stay consistent.
    return this.ordersService.updateStatus(
      tenantId,
      orderId,
      status,
      userId ?? 'SYSTEM',
    );
  }

  async updateTicketStatus(
    ticketId: string,
    status: OrderStatus,
    tenantId: string,
  ) {
    // Verify the ticket belongs to an order in this tenant
    const ticket = await this.prisma.orderItemTicket.findFirst({
      where: {
        id: ticketId,
        orderItem: {
          order: {
            tenantId,
          },
        },
      },
    });

    if (!ticket) {
      throw new ForbiddenException('Ticket not found');
    }

    return this.prisma.orderItemTicket.update({
      where: { id: ticketId },
      data: {
        status,
        ...(status === 'READY' && { bumpedAt: new Date() }),
      },
    });
  }
}
