import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Req,
  ParseFloatPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { Request } from 'express';
import { InventoryChangeType, QueryParams, UserRole } from '@repo/types';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}
  @Get('low-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getLowStock(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('branchId') branchId?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.inventoryService.getLowStockByTenant(user.tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      branchId,
    });
  }

  /**
   * Get low stock products for a specific branch
   */
  @Get(':branchId/low-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getLowStockByBranch(
    @Param('branchId') branchId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getLowStockByBranch(branchId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(':branchId')
  async getInventory(@Req() req: Request, @Param('branchId') branchId: string) {
    const query = req.query as QueryParams;

    return this.inventoryService.getInventoryByBranch(branchId, query);
  }

  @Get(':branchId/product/:productId')
  async getInventoryItem(
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
  ) {
    return this.inventoryService.getInventoryItem(branchId, productId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Put(':branchId/product/:productId')
  async setStock(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Body('stock', ParseFloatPipe) stock: number,
    @Body('reason') reason?: string,
  ) {
    const user = req.user as { tenantId: string; id: string };
    return this.inventoryService.setStock(
      user.tenantId,
      branchId,
      productId,
      stock,
      user.id,
      reason,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post(':branchId/product/:productId/adjust')
  adjustStock(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Body('adjustment') adjustment: number,
    @Body('reason') reason?: string,
  ) {
    const user = req.user as { tenantId: string; id: string };
    return this.inventoryService.adjustStock(
      user.tenantId,
      branchId,
      productId,
      adjustment,
      user.id,
      reason,
    );
  }

  /**
   * Set minimum stock threshold for a product at a branch
   */
  @Put(':branchId/product/:productId/min-stock')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async setMinStock(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Body('minStock', ParseFloatPipe) minStock: number,
    @Body('reason') reason?: string,
  ) {
    const user = req.user as { tenantId: string; id: string };
    return this.inventoryService.setMinStock(
      user.tenantId,
      branchId,
      productId,
      minStock,
      user.id,
      reason,
    );
  }

  /**
   * Bulk set minimum stock thresholds for multiple products at a branch
   */
  @Post(':branchId/min-stock/bulk')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async bulkSetMinStock(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Body()
    body: {
      items: Array<{ productId: string; minStock: number }>;
      reason?: string;
    },
  ) {
    const user = req.user as { tenantId: string; id: string };
    return this.inventoryService.bulkSetMinStock(
      user.tenantId,
      branchId,
      body.items,
      user.id,
      body.reason,
    );
  }

  /**
   * Get inventory history log with filtering and pagination
   */
  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getInventoryHistory(@Req() req: Request) {
    const user = req.user as { tenantId: string };
    const query = req.query as QueryParams & {
      changeType?: InventoryChangeType;
      startDate?: string;
      endDate?: string;
      userId: string;
    };
    const params = {
      branchId: req.params.branchId,
      productId: req.params.productId,
    };

    return this.inventoryService.getInventoryHistory(
      user.tenantId,
      params,
      query,
    );
  }

  /**
   * Get inventory history for a specific branch
   */
  @Get(':branchId/history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getInventoryHistoryByBranch(@Req() req: Request) {
    const user = req.user as { tenantId: string };
    const query = req.query as QueryParams & {
      changeType?: InventoryChangeType;
      startDate?: string;
      endDate?: string;
      userId: string;
    };
    const params = {
      branchId: req.params.branchId,
      productId: req.params.productId,
    };
    return this.inventoryService.getInventoryHistory(
      user.tenantId,
      params,
      query,
    );
  }

  /**
   * Get inventory history for a specific product
   */
  @Get(':branchId/product/:productId/history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  async getInventoryHistoryByProduct(@Req() req: Request) {
    const user = req.user as { tenantId: string };
    const params = {
      branchId: req.params.branchId,
      productId: req.params.productId,
    };
    const query = req.query as QueryParams & {
      startDate?: string;
      endDate?: string;
      productId: string;
      userId: string;
    };
    return this.inventoryService.getInventoryHistory(
      user.tenantId,
      params,
      query,
    );
  }
}
