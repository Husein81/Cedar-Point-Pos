import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, prisma } from '@repo/db';

import { CreateRefundDto } from './dto/create-refund.dto.js';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  async createRefund(tenantId: string, createRefundDto: CreateRefundDto) {
    const { orderId, productId, quantity, reason } = createRefundDto;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        items: {
          where: {
            productId,
          },
          include: {
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
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (order.items.length === 0) {
      throw new BadRequestException('Product is not part of this order');
    }
    const totalOrderedQuantity = order.items.reduce(
      (sum, item) => sum.plus(new Prisma.Decimal(item.quantity)),
      new Prisma.Decimal(0),
    );
    const existingRefunds = await prisma.refund.findMany({
      where: {
        orderId,
        productId,
      },
    });

    const totalRefundedQuantity = existingRefunds.reduce(
      (sum, refund) => sum.plus(new Prisma.Decimal(refund.quantity)),
      new Prisma.Decimal(0),
    );

    const availableQuantity = totalOrderedQuantity.minus(totalRefundedQuantity);
    const refundQuantity = new Prisma.Decimal(quantity);
    if (refundQuantity.greaterThan(availableQuantity)) {
      throw new BadRequestException(
        `Refund quantity (${quantity}) exceeds available quantity (${Number(availableQuantity)})`,
      );
    }
    let remainingToRefund = refundQuantity;
    let totalRefundAmount = new Prisma.Decimal(0);
    const refundItems: Array<{
      orderItemId: string;
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }> = [];

    for (const orderItem of order.items) {
      if (remainingToRefund.lte(0)) {
        break;
      }
      const itemRefunds = await prisma.refundItem.findMany({
        where: {
          orderItemId: orderItem.id,
        },
      });

      const itemRefundedQuantity = itemRefunds.reduce(
        (sum, refundItem) => sum.plus(new Prisma.Decimal(refundItem.quantity)),
        new Prisma.Decimal(0),
      );

      const itemAvailableQuantity = new Prisma.Decimal(
        orderItem.quantity,
      ).minus(itemRefundedQuantity);

      if (itemAvailableQuantity.lte(0)) {
        continue;
      }
      const refundFromItem = Prisma.Decimal.min(
        remainingToRefund,
        itemAvailableQuantity,
      );

      const unitPrice = orderItem.unitPrice || new Prisma.Decimal(0);
      const itemSubtotal = refundFromItem.times(unitPrice);

      refundItems.push({
        orderItemId: orderItem.id,
        quantity: refundFromItem,
        unitPrice,
        subtotal: itemSubtotal,
      });

      totalRefundAmount = totalRefundAmount.plus(itemSubtotal);
      remainingToRefund = remainingToRefund.minus(refundFromItem);
    }
    const refund = await prisma.refund.create({
      data: {
        orderId,
        productId,
        quantity: refundQuantity,
        totalAmount: totalRefundAmount,
        reason: reason || null,
        refundedAt: new Date(),
        refundItems: {
          create: refundItems.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
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
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        refundItems: {
          include: {
            orderItem: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Refund created: ${refund.id} for order ${orderId}, product ${productId}, quantity ${quantity}`,
    );

    return refund;
  }
}
