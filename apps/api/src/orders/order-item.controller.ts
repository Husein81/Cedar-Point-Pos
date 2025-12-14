import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import type { AddModifierDto } from './dto/add-modifier-dto';
import { OrderItemService } from './order-item.service';

@Controller('order-items')
export class OrderItemController {
  constructor(private orderItemService: OrderItemService) {}

  @Post('modifiers/:id')
  addModifier(@Param('id') id: string, @Body() body: AddModifierDto) {
    return this.orderItemService.addModifier(id, body);
  }

  @Delete('modifiers/:id')
  removeModifier(@Param('id') id: string) {
    return this.orderItemService.removeModifier(id);
  }
}
