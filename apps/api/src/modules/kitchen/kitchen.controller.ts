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
  Put,
} from '@nestjs/common';
import { KitchenService } from './kitchen.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/client.js';
import type { Request } from 'express';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';

interface AuthRequest extends Request {
  user: {
    id: string;
    username: string;
    tenantId?: string;
    role: UserRole;
  };
}

@Controller('kitchen')
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.KITCHEN)
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  getKitchenOrders(
    @Req() req: AuthRequest,
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User must belong to a tenant');
    }
    return this.kitchenService.getKitchenOrders(tenantId, branchId, {
      page,
      limit,
    });
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

  @Put('orders/:id/status')
  @HttpCode(HttpStatus.OK)
  updateOrderStatus(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: AuthRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User must belong to a tenant');
    }
    return this.kitchenService.updateOrderStatus(
      orderId,
      dto.status,
      tenantId,
      req.user.id,
      req.user.role,
    );
  }

  @Put('tickets/:id/status')
  @HttpCode(HttpStatus.OK)
  updateTicketStatus(
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
    @Req() req: AuthRequest,
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new Error('User must belong to a tenant');
    }
    return this.kitchenService.updateTicketStatus(
      ticketId,
      dto.status,
      tenantId,
    );
  }
}
