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

  async createRefund(tenantId: string, createRefundDto: CreateRefundDto) {
    const { orderId, reason, items } = createRefundDto;

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

    if (order.items.length === 0) {
      throw new BadRequestException('Order has no items');
    }

    let totalRefundAmount = new Prisma.Decimal(0);

    const refundItems = [] as RefundItem[];

    for (const item of items) {
      const orderItem = order.items.find((oi) => oi.id === item.orderItemId);

      if (!orderItem) {
        throw new BadRequestException(
          `Order item ${item.orderItemId} is not part of this order`,
        );
      }

      // Already refunded quantity for this order item
      const alreadyRefunded = await this.getAlreadyRefundedQuantity(
        orderItem.id,
      );

      const refundableQuantity = new Prisma.Decimal(orderItem.quantity).minus(
        alreadyRefunded,
      );

      const requestedQuantity = new Prisma.Decimal(item.quantity);

      if (requestedQuantity.lte(0)) {
        throw new BadRequestException(
          'Refund quantity must be greater than zero',
        );
      }

      if (requestedQuantity.greaterThan(refundableQuantity)) {
        throw new BadRequestException(
          `Refund quantity (${requestedQuantity.toString()}) exceeds remaining quantity (${refundableQuantity.toString()})`,
        );
      }

      const unitPrice = orderItem.unitPrice;
      const subtotal = requestedQuantity.mul(unitPrice);

      refundItems.push({
        orderItemId: orderItem.id,
        quantity: requestedQuantity.toFixed(4),
        unitPrice: unitPrice.toFixed(2),
        subtotal: subtotal.toFixed(2),
      });

      totalRefundAmount = totalRefundAmount.plus(subtotal);
    }

    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        reason,
        totalAmount: totalRefundAmount,
        refundedAt: new Date(),
        refundItems: {
          create: refundItems,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
          },
        },
        refundItems: {
          include: {
            orderItem: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                productId: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Refund created: ${refund.id} for order ${orderId} with ${refundItems.length} items`,
    );

    return refund;
  }

  private async getAlreadyRefundedQuantity(orderItemId: string) {
    const result = await this.prisma.refundItem.aggregate({
      where: { orderItemId },
      _sum: { quantity: true },
    });
    return new Prisma.Decimal(result._sum.quantity || 0);
  }
}
