import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { KitchenService } from './kitchen.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/client.js';
import type { Request } from 'express';
import { OrderStatus } from '@repo/types';

interface AuthRequest extends Request {
  user: {
    id: string;
    username: string;
    tenantId?: string;
    role: UserRole;
  };
}

@Controller('kitchen')
@Roles(UserRole.ADMIN, UserRole.MANAGER, 'KITCHEN')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  getKitchenOrders(
    @Req() req: AuthRequest,
    @Query('branchId') branchId?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User must belong to a tenant');
    }
    return this.kitchenService.getKitchenOrders(tenantId, branchId);
  }

  @Get('orders/:id')
  @HttpCode(HttpStatus.OK)
  getOrderById(@Param('id') orderId: string, @Req() req: AuthRequest) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User must belong to a tenant');
    }
    return this.kitchenService.getOrderById(orderId, tenantId);
  }

  @Patch('orders/:id/status')
  @HttpCode(HttpStatus.OK)
  updateOrderStatus(
    @Param('id') orderId: string,
    @Body() body: { status: OrderStatus },
    @Req() req: AuthRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User must belong to a tenant');
    }
    return this.kitchenService.updateOrderStatus(
      orderId,
      body.status,
      tenantId,
      req.user.id,
    );
  }

  @Patch('tickets/:id/status')
  @HttpCode(HttpStatus.OK)
  updateTicketStatus(
    @Param('id') ticketId: string,
    @Body() body: { status: OrderStatus },
    @Req() req: AuthRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User must belong to a tenant');
    }
    return this.kitchenService.updateTicketStatus(
      ticketId,
      body.status,
      tenantId,
    );
  }
}
