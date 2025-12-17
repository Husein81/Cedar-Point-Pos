import { Roles } from '../common/decorators/roles.decorator.js';
import { Body, Controller, Delete, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AddModifierDto } from './dto/add-modifier-dto.js';
import type { CreateTicketDto } from './dto/create-ticket.dto.js';
import { OrderItemService } from './order-item.service.js';
import { UserRole } from '@repo/types';

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

  @Post('tickets')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
  createTicket(@Req() req: Request, @Body() createTicketDto: CreateTicketDto) {
    const user = req.user as { tenantId: string };
    return this.orderItemService.createTicket(user.tenantId, createTicketDto);
  }
}
