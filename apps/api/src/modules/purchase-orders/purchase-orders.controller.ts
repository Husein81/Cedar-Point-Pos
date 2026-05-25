import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { QueryParams, UserRole } from '@repo/types';
import type { Request } from 'express';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreatePurchaseOrderSchema } from './dto/create-purchase-order.dto.js';
import { UpdatePurchaseOrderSchema } from './dto/update-purchase-order.dto.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  /**
   * Get paginated list of purchase orders
   */
  @Get('paginated')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAllPaginated(@CurrentTenant() tenantId: string, @Req() req: Request) {
    const query = req.query as QueryParams & {
      status?: string;
      supplierId?: string;
      branchId?: string;
    };
    return this.purchaseOrdersService.getPurchaseOrdersPaginated(
      tenantId,
      query,
    );
  }

  /**
   * Create a new purchase order with items
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(
    @CurrentTenant() tenantId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const dto = CreatePurchaseOrderSchema.parse(body);
    const { id: userId } = req.user as { id: string };
    return this.purchaseOrdersService.createPurchaseOrder(
      tenantId,
      userId,
      dto,
    );
  }

  /**
   * Get a purchase order by ID with items
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.getPurchaseOrder(tenantId, id);
  }

  /**
   * Update purchase order metadata
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = UpdatePurchaseOrderSchema.parse(body);
    return this.purchaseOrdersService.updatePurchaseOrder(tenantId, id, dto);
  }

  /**
   * Mark purchase order as received and update inventory
   */
  @Post(':id/receive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  receive(
    @CurrentTenant() tenantId: string,
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    const { id: userId } = req.user as { id: string };
    return this.purchaseOrdersService.receivePurchaseOrder(
      tenantId,
      userId,
      id,
    );
  }

  /**
   * Cancel a purchase order
   */
  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  cancel(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.cancelPurchaseOrder(tenantId, id);
  }
}
