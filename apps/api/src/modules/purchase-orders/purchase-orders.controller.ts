import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { UserRole } from '@repo/types';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import type { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  /**
   * Create a new purchase order with items
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Req() req: Request, @Body() createDto: CreatePurchaseOrderDto) {
    const user = req.user as { tenantId: string; id: string };
    return this.purchaseOrdersService.createPurchaseOrder(
      user.tenantId,
      user.id,
      createDto,
    );
  }

  /**
   * Get a purchase order by ID with items
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.purchaseOrdersService.getPurchaseOrder(user.tenantId, id);
  }

  /**
   * Update purchase order metadata
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateDto: UpdatePurchaseOrderDto,
  ) {
    const user = req.user as { tenantId: string };
    return this.purchaseOrdersService.updatePurchaseOrder(
      user.tenantId,
      id,
      updateDto,
    );
  }

  /**
   * Mark purchase order as received and update inventory
   */
  @Post(':id/receive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  receive(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string; id: string };
    return this.purchaseOrdersService.receivePurchaseOrder(
      user.tenantId,
      user.id,
      id,
    );
  }

  /**
   * Cancel a purchase order
   */
  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  cancel(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { tenantId: string };
    return this.purchaseOrdersService.cancelPurchaseOrder(user.tenantId, id);
  }
}
