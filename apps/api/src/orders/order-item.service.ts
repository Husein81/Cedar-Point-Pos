import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { OrderStatus } from '@repo/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddModifierDto } from './dto/add-modifier-dto.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { OrdersService } from './orders.service.js';
import { TaxService } from './tax.service.js';

@Injectable()
export class OrderItemService {
  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private prisma: PrismaService,
    private readonly taxService: TaxService,
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
    taxRate: number,
  ): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = this.round(quantity * (unitPrice + modifiersUnitPrice));
    const taxAmount = this.taxService.calculateItemTax(subtotal, taxRate);
    const total = this.round(subtotal + taxAmount);

    return { subtotal, taxAmount, total };
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
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

    const quantity = Number(orderItem.quantity);
    const unitPrice = Number(orderItem.unitPrice || 0);

    const modifiersUnitPrice = orderItem.modifiers.reduce(
      (sum, mod) => sum + Number(mod.price),
      0,
    );
    const taxRate = Number(orderItem.product.tax?.rate || 0);

    const {
      subtotal: itemSubtotal,
      taxAmount: itemTaxAmount,
      total: itemTotal,
    } = this.calculateItemPricing(
      quantity,
      unitPrice,
      modifiersUnitPrice,
      taxRate,
    );

    const updatedItem = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        subtotal: itemSubtotal,
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
