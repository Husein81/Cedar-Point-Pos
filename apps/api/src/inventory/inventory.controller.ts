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
import { InventoryService } from './inventory.service';
import { Roles } from '@/common/decorators/roles.decorator';
import type { Request } from 'express';
import { UserRole } from '@repo/db';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Get all low stock products for the tenant (across all branches or filtered by branch)
   */
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
  ) {
    const user = req.user as { tenantId: string };
    return this.inventoryService.setStock(
      user.tenantId,
      branchId,
      productId,
      stock,
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
  @Post(':branchId/product/:productId/adjust')
  async adjustStock(
    @Req() req: Request,
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @Body('adjustment', ParseFloatPipe) adjustment: number,
  ) {
    const user = req.user as { tenantId: string };
    return this.inventoryService.adjustStock(
      user.tenantId,
      branchId,
      productId,
      adjustment,
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
  ) {
    const user = req.user as { tenantId: string };
    return this.inventoryService.setMinStock(
      user.tenantId,
      branchId,
      productId,
      minStock,
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
    @Body() body: { items: Array<{ productId: string; minStock: number }> },
  ) {
    const user = req.user as { tenantId: string };
    return this.inventoryService.bulkSetMinStock(
      user.tenantId,
      branchId,
      body.items,
    );
  }
}
