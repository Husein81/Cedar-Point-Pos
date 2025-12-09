/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StockAdjustmentService } from './stock-adjustment.service';
import type {
  CreateStockAdjustmentDto,
  StockAdjustmentHistoryQueryDto,
} from './dto/stock-adjustment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdjustmentType } from '@repo/types';
import type { Request } from 'express';

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
  @Roles('OWNER', 'MANAGER')
  async adjustStock(
    @Req() req: Request,
    @Body() adjustmentDto: CreateStockAdjustmentDto,
  ) {
    const user = req.user as { tenantId: string; userId: string };
    const tenantId = user.tenantId;
    const userId = user.userId;

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
  @Roles('OWNER', 'MANAGER')
  async getAdjustmentHistory(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('branchId') branchId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: AdjustmentType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { tenantId } = req.user as { tenantId: string };
    const queryDto: StockAdjustmentHistoryQueryDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      branchId,
      productId,
      type,
      startDate,
      endDate,
    };
    return this.stockAdjustmentService.getAdjustmentHistory(tenantId, queryDto);
  }

  /**
   * Get adjustment summary statistics
   */
  @Get('summary')
  @Roles('OWNER', 'MANAGER')
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
  @Roles('OWNER', 'MANAGER')
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
