import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketStatus } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddModifierDto } from './dto/add-modifier-dto.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { OrdersService } from './orders.service.js';

@Injectable()
export class OrderItemService {
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
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

  calculateItemPricing(
    quantity: number,
    unitPrice: number,
    modifiersUnitPrice: number,
  ): { subtotal: number; total: number } {
    const subtotal = this.round(quantity * (unitPrice + modifiersUnitPrice));
    const total = this.round(subtotal);

    return { subtotal, total };
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async recalculateOrderItemTotal(orderItemId: string) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        modifiers: true,
        order: true,
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const quantity = Number(orderItem.quantity);
    const unitPrice = Number(orderItem.unitPrice || 0);

    const modifiersUnitPrice = orderItem.modifiers.reduce(
      (sum, mod) => sum + Number(mod.price),
      0,
    );

    const { subtotal: itemSubtotal, total: itemTotal } =
      this.calculateItemPricing(quantity, unitPrice, modifiersUnitPrice);

    const updatedItem = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        subtotal: itemSubtotal,
        total: itemTotal,
      },
      include: { modifiers: true },
    });

    await this.ordersService.recalculateOrderTotals(
      String(orderItem.order.tenantId),
      orderItem.orderId,
    );

    return updatedItem;
  }

  async createTicket(tenantId: string, createTicketDto: CreateTicketDto) {
    const { orderItemId, station, status } = createTicketDto;
    if (!orderItemId || !tenantId) {
      throw new BadRequestException('Order item ID is required');
    }

    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { tenantId },
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
        status: TicketStatus.QUEUED,
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'A ticket already exists for this item/station',
      );
    }
    const finalStatus = status ?? TicketStatus.QUEUED;

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
