import { Roles } from '@/common/decorators/roles.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { OrderStatus, OrderType, UserRole } from '@repo/db';
import type { Request } from 'express';
import type { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tableId') tableId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    const user = req.user as { tenantId: string };
    return this.ordersService.findAll(user.tenantId, {
      page,
      limit,
      status,
      branchId,
      userId,
      type,
      startDate,
      endDate,
      tableId,
      search,
      order,
      sort,
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

  /**
   * Complete an order (triggers automatic stock deduction)
   */
  @Post(':id/complete')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  completeOrder(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string; userId: string };
    return this.ordersService.completeOrder(user.tenantId, id, user.userId);
  }

  /**
   * Update order status
   * If status is COMPLETED, triggers automatic stock deduction
   */
  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
  updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { status: OrderStatus },
  ) {
    const user = req.user as { tenantId: string };
    return this.ordersService.updateStatus(user.tenantId, id, body.status);
  }

  /**
   * Preview stock deductions for an order
   * Shows what inventory will be affected without executing
   */
  @Get(':id/preview-deductions')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  previewDeductions(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.ordersService.previewOrderStockDeductions(user.tenantId, id);
  }

  /**
   * Send order to kitchen
   * Transitions status to SENT_TO_KITCHEN and creates tickets
   */
  @Post(':id/send-to-kitchen')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async sendToKitchen(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.ordersService.sendToKitchen(user.tenantId, id);
  }
}
