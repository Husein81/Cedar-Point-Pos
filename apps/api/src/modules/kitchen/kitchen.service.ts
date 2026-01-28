import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventoryDeductionService } from '../inventory/inventory-deduction.service.js';
import { OrderStatus } from '@repo/types';

@Injectable()
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryDeductionService: InventoryDeductionService,
  ) {}

  async getKitchenOrders(tenantId: string, branchId?: string) {
    // Get orders that are in kitchen-relevant statuses
    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        ...(branchId && { branchId }),
        status: {
          in: ['CONFIRMED', 'IN_PROGRESS', 'SENT_TO_KITCHEN', 'READY'],
        },
      },
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
            tickets: {
              orderBy: {
                sentAt: 'desc',
              },
              take: 1,
            },
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
    });

    return orders;
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
            tickets: {
              orderBy: {
                sentAt: 'desc',
              },
            },
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
