import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  StaffActivityAction,
  StaffActivityModule,
  UserRole,
} from '@repo/types';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { LogActivity } from '../staff/decorators/log-activity.decorator.js';
import type { CreateStockAdjustmentDto } from './dto/stock-adjustment.dto.js';
import { StockAdjustmentService } from './stock-adjustment.service.js';

@Controller('inventory/adjustments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockAdjustmentController {
  constructor(
    private readonly stockAdjustmentService: StockAdjustmentService,
  ) {}

  /**
   * Create a stock adjustment (ADD, REMOVE, or SET)
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @LogActivity(
    StaffActivityAction.STOCK_ADJUSTED,
    StaffActivityModule.INVENTORY,
  )
  async adjustStock(
    @Req() req: Request,
    @Body() adjustmentDto: CreateStockAdjustmentDto,
  ) {
    const user = req.user as { tenantId: string; id: string };
    const tenantId = user.tenantId;
    const userId = user.id;

    return this.stockAdjustmentService.adjustStock(
      tenantId,
      userId,
      adjustmentDto,
    );
  }

  /**
   * Get adjustment history with filters
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAdjustmentHistory(@Req() req: Request) {
    const queryDto = req.query;
    const { tenantId } = req.user as { tenantId: string };
    return this.stockAdjustmentService.getAdjustmentHistory(tenantId, queryDto);
  }

  /**
   * Get adjustment summary statistics
   */
  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAdjustmentSummary(
    @Req() req: Request,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.stockAdjustmentService.getAdjustmentSummary(
      tenantId,
      branchId,
      startDate,
      endDate,
    );
  }

  /**
   * Get adjustment history for a specific inventory item
   */
  @Get('inventory/:branchId/:productId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getInventoryAdjustmentHistory(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    return this.stockAdjustmentService.getInventoryAdjustmentHistory(
      tenantId,
      branchId,
      productId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
