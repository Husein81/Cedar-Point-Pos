import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@repo/types';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { AddModifierDto } from './dto/add-modifier-dto.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { OrdersService } from './orders.service.js';

@Injectable()
export class OrderItemService {
  constructor(
    private readonly ordersService: OrdersService,
    private prisma: PrismaService,
  ) {}

  async addModifier(orderItemId: string, addModifierDto: AddModifierDto) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const modifier = await this.prisma.modifier.findUnique({
      where: { id: addModifierDto.modifierId },
    });

    if (!modifier) {
      throw new NotFoundException('Modifier not found');
    }

    await this.prisma.orderItemModifier.create({
      data: {
        orderItemId: orderItem.id,
        modifierId: modifier.id,
        price: modifier.price,
      },
    });

    return this.recalculateOrderItemTotal(orderItem.id);
  }

  async removeModifier(orderItemId: string) {
    const modifier = await this.prisma.orderItemModifier.findUnique({
      where: { id: orderItemId },
    });
    if (!modifier) {
      throw new NotFoundException('Modifier not found');
    }

    await this.prisma.orderItemModifier.delete({
      where: { id: orderItemId },
    });

    return this.recalculateOrderItemTotal(modifier.orderItemId);
  }

  private async recalculateOrderItemTotal(orderItemId: string) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        modifiers: true,
        product: {
          include: {
            tax: true,
          },
        },
        order: true,
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const quantity = new Prisma.Decimal(orderItem.quantity);
    const unitPrice = orderItem.unitPrice || new Prisma.Decimal(0);

    const modifiersTotal = orderItem.modifiers.reduce(
      (sum, mod) => sum.plus(new Prisma.Decimal(mod.price)),
      new Prisma.Decimal(0),
    );
    const taxRate = orderItem.product.tax?.rate || new Prisma.Decimal(0);

    const itemSubtotal = quantity.times(unitPrice.plus(modifiersTotal));
    const itemTaxAmount = itemSubtotal.times(taxRate).dividedBy(100);
    const itemTotal = itemSubtotal.plus(itemTaxAmount);

    const updatedItem = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        taxRate,
        taxAmount: itemTaxAmount,
        total: itemTotal,
      },
      include: { modifiers: true },
    });

    await this.ordersService.recalculateOrderTotals(
      orderItem.order.tenantId,
      orderItem.orderId,
    );

    return updatedItem;
  }

  async createTicket(tenantId: string, createTicketDto: CreateTicketDto) {
    const { orderItemId, station, status } = createTicketDto;
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
      },
      select: {
        id: true,
        order: { select: { tenantId: true } },
      },
    });

    if (!orderItem || orderItem.order.tenantId !== tenantId) {
      throw new NotFoundException('Order item not found');
    }
    const existing = await this.prisma.orderItemTicket.findFirst({
      where: {
        orderItemId,
        station: station ?? null,
        status: { in: [OrderStatus.SENT_TO_KITCHEN, OrderStatus.PENDING] },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'A ticket already exists for this item/station',
      );
    }
    const finalStatus = status ?? OrderStatus.SENT_TO_KITCHEN;

    const ticket = await this.prisma.orderItemTicket.create({
      data: {
        orderItemId: orderItem.id,
        station: station || null,
        status: finalStatus,
        sentAt: finalStatus ? new Date() : undefined,
      },
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
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return ticket;
  }
}
