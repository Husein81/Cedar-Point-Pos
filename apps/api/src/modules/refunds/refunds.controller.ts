import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { StaffActivityAction, StaffActivityModule, UserRole } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { LogActivity } from '../staff/decorators/log-activity.decorator.js';
import { type CreateRefundDto } from './dto/create-refund.dto.js';
import { RefundsService } from './refunds.service.js';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  /**
   * Get orders eligible for refund
   * Returns orders with status COMPLETED
   */
  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  getRefundableOrders(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('branchId') branchId?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.refundsService.getRefundableOrders(user.tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      dateFrom,
      dateTo,
      branchId,
    });
  }

  /**
   * Get refundable information for an order
   * Returns order items with already refunded quantities
   */
  @Get('order/:orderId/refundable')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  getRefundableInfo(@Req() req: Request, @Param('orderId') orderId: string) {
    const user = req.user as { tenantId: string };
    return this.refundsService.getRefundableInfo(user.tenantId, orderId);
  }

  /**
   * Get refund history for a specific order
   */
  @Get('order/:orderId/history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  getOrderRefundHistory(
    @Req() req: Request,
    @Param('orderId') orderId: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.refundsService.getOrderRefundHistory(user.tenantId, orderId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @LogActivity(StaffActivityAction.REFUND_CREATED, StaffActivityModule.REFUNDS)
  createRefund(@Req() req: Request, @Body() dto: CreateRefundDto) {
    const user = req.user as { id: string; tenantId: string };
    return this.refundsService.createRefund(user.tenantId, user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  findAll(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('productId') productId?: string,
    @Query('orderId') orderId?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.refundsService.findAll(user.tenantId, {
      from,
      to,
      productId,
      orderId,
    });
  }
}
