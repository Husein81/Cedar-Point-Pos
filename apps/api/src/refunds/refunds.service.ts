import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateRefundDto } from './dto/create-refund.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { RefundItem } from '@repo/types';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createRefund(tenantId: string, userId: string, dto: CreateRefundDto) {
    const { orderId, reason, items } = dto;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== 'COMPLETED') {
        throw new BadRequestException('Only completed orders can be refunded');
      }

      let totalRefundAmount = new Prisma.Decimal(0);
      const refundItems: RefundItem[] = [];

      for (const item of items) {
        const orderItem = order.items.find((oi) => oi.id === item.orderItemId);

        if (!orderItem) {
          throw new BadRequestException(
            `Order item ${item.orderItemId} not found in order`,
          );
        }

        // Prevent over-refund
        const alreadyRefunded = await this.getAlreadyRefundedQuantity(
          orderItem.id,
        );

        const refundableQuantity = new Prisma.Decimal(orderItem.quantity).minus(
          alreadyRefunded,
        );

        const requestedQty = new Prisma.Decimal(item.quantity);

        if (requestedQty.greaterThan(refundableQuantity)) {
          throw new BadRequestException(
            `Refund exceeds remaining quantity (${refundableQuantity.toString()})`,
          );
        }

        const unitPrice = new Prisma.Decimal(Number(orderItem.unitPrice));
        const subtotal = requestedQty.mul(unitPrice);

        refundItems.push({
          orderItemId: orderItem.id,
          quantity: requestedQty.toFixed(4),
          unitPrice: unitPrice.toFixed(2),
          subtotal: subtotal.toFixed(2),
        });

        totalRefundAmount = totalRefundAmount.plus(subtotal);

        // 🔁 RESTORE INVENTORY (CORRECT MODEL)
        const inventory = await tx.inventory.findUnique({
          where: {
            branchId_productId: {
              branchId: order.branchId,
              productId: orderItem.productId,
            },
          },
        });

        if (!inventory) {
          throw new NotFoundException(
            'Inventory record not found for refunded item',
          );
        }

        const beforeStock = inventory.stock;
        const afterStock = beforeStock.plus(requestedQty);

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { stock: afterStock },
        });

        // 🧾 INVENTORY HISTORY (AUDIT)
        await tx.inventoryHistory.create({
          data: {
            tenantId,
            branchId: order.branchId,
            productId: orderItem.productId,
            userId,
            changeType: 'ORDER_RETURN',
            beforeStock,
            afterStock,
            adjustment: requestedQty,
            reason: `Refund for order ${order.orderNumber ?? order.id}`,
          },
        });
      }

      // Create refund record
      return tx.refund.create({
        data: {
          orderId,
          reason,
          totalAmount: totalRefundAmount.toFixed(2),
          refundedAt: new Date(),
          refundItems: {
            create: refundItems,
          },
        },
        include: {
          refundItems: true,
        },
      });
    });
  }

  private async getAlreadyRefundedQuantity(orderItemId: string) {
    const result = await this.prisma.refundItem.aggregate({
      where: { orderItemId },
      _sum: { quantity: true },
    });
    return new Prisma.Decimal(result._sum.quantity || 0);
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
}
