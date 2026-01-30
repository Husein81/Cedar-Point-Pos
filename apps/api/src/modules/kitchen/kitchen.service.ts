import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventoryDeductionService } from '../inventory/inventory-deduction.service.js';
import { OrderStatus, QueryParams } from '@repo/types';
import { Prisma } from '../../generated/prisma/browser.js';

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryDeductionService: InventoryDeductionService,
  ) {}

  async getKitchenOrders(
    tenantId: string,
    branchId?: string,
    params?: QueryParams,
  ) {
    const { page, limit } = params || {};
    const skip = (Number(page) - 1) * Number(limit);
    const where: Prisma.OrderWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      status: {
        in: [
          'CONFIRMED',
          'IN_PROGRESS',
          'SENT_TO_KITCHEN',
          'READY',
          'FULLY_REFUNDED',
        ],
      },
    };
    // Get orders that are in kitchen-relevant statuses
    const [totalCount, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
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
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        tenant: {
          select: { businessType: true },
        },
      },
    });

    if (!order) {
      throw new ForbiddenException('Order not found');
    }

    // If marking as COMPLETED, also set completedAt and deduct inventory
    if (status === 'COMPLETED') {
      return this.prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            status,
            completedAt: new Date(),
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        // Deduct inventory for restaurant orders when completed by kitchen
        if (userId) {
          await this.inventoryDeductionService.deductStockForOrder(
            tenantId,
            orderId,
            order.branchId,
            userId,
          );
        }

        return updatedOrder;
      });
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
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
