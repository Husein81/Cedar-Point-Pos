import { Controller, Get, Post, Body, Param, Req, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, OrderStatus, OrderType } from '@repo/db';
import type { Request } from 'express';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a new order in DRAFT status
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  create(@Req() req: Request, @Body() createOrderDto: CreateOrderDto) {
    const user = req.user as { tenantId: string; id: string };
    return this.ordersService.create(user.tenantId, user.id, createOrderDto);
  }

  /**
   * Get all orders with optional filters
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrderStatus,
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: OrderType,
  ) {
    const user = req.user as { tenantId: string };
    return this.ordersService.findAll(user.tenantId, {
      page,
      limit,
      status,
      branchId,
      userId,
      type,
    });
  }

  /**
   * Get a specific order by ID
   */
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.ordersService.findOne(user.tenantId, id);
  }
}
