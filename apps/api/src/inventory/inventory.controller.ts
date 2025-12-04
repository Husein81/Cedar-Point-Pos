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

  @Get(':branchId')
  async getInventory(
    @Param('branchId') branchId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getInventoryByBranch(branchId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
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
}
