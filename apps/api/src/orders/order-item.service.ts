import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderItem, prisma } from '@repo/db';
import { AddModifierDto } from './dto/add-modifier-dto';

@Injectable()
export class OrderItemService {
  async addModifier(orderItemId: string, addModifierDto: AddModifierDto) {
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const modifier = await prisma.modifier.findUnique({
      where: { id: addModifierDto.modifierId },
    });

    if (!modifier) {
      throw new NotFoundException('Modifier not found');
    }

    await prisma.orderItemModifier.create({
      data: {
        orderItemId: orderItem.id,
        modifierId: modifier.id,
        name: modifier.name,
        price: modifier.price,
      },
    });

    return this.recalculateOrderItemTotal(orderItem.id);
  }

  async removeModifier(orderItemId: string) {
    const modifier = await prisma.orderItemModifier.findUnique({
      where: { id: orderItemId },
    });
    if (!modifier) {
      throw new NotFoundException('Modifier not found');
    }

    await prisma.orderItemModifier.delete({
      where: { id: orderItemId },
    });

    return this.recalculateOrderItemTotal(modifier.orderItemId);
  }

  private async recalculateOrderItemTotal(
    orderItemId: string,
  ): Promise<OrderItem> {
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { modifiers: true },
    });

    const modifiersTotal = orderItem?.modifiers.reduce(
      (sum, mod) => sum + Number(mod.price),
      0,
    );

    const total =
      Number(orderItem?.quantity) *
      (Number(orderItem?.unitPrice) + Number(modifiersTotal));

    return await prisma.orderItem.update({
      where: { id: orderItemId },
      data: { total },
      include: { modifiers: true },
    });
  }
}
