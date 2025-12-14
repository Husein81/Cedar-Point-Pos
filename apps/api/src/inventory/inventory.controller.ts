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
  ParseEnumPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Roles } from '@/common/decorators/roles.decorator';
import type { Request } from 'express';
import { UserRole, InventoryChangeType } from '@repo/db';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}
  @Get('low-stock')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
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
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
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
  async getInventory(
    @Param('branchId') branchId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getInventoryByBranch(branchId, {
      page,
      limit,
      search,
    });
  }

  @Get(':branchId/product/:productId')
  async getInventoryItem(
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
  ) {
    return this.inventoryService.getInventoryItem(branchId, productId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
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

  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
  @Post(':branchId/product/:productId/adjust')
  async adjustStock(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Body('adjustment', ParseFloatPipe) adjustment: number,
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
  @Roles(UserRole.OWNER, UserRole.MANAGER)
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
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async bulkSetMinStock(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Body() body: {
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
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getInventoryHistory(
    @Req() req: Request,
    @Query('branchId') branchId?: string,
    @Query('productId') productId?: string,
    @Query('userId') userId?: string,
    @Query('changeType', new ParseEnumPipe(InventoryChangeType, { optional: true }))
    changeType?: InventoryChangeType,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.inventoryService.getInventoryHistory(user.tenantId, {
      branchId,
      productId,
      userId,
      changeType,
      page: page || 1,
      limit: limit || 20,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * Get inventory history for a specific branch
   */
  @Get(':branchId/history')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getInventoryHistoryByBranch(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Query('productId') productId?: string,
    @Query('userId') userId?: string,
    @Query('changeType', new ParseEnumPipe(InventoryChangeType, { optional: true }))
    changeType?: InventoryChangeType,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.inventoryService.getInventoryHistory(user.tenantId, {
      branchId,
      productId,
      userId,
      changeType,
      page: page || 1,
      limit: limit || 20,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * Get inventory history for a specific product
   */
  @Get(':branchId/product/:productId/history')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getInventoryHistoryByProduct(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const user = req.user as { tenantId: string };
    return this.inventoryService.getInventoryHistory(user.tenantId, {
      branchId,
      productId,
      page: page || 1,
      limit: limit || 20,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
